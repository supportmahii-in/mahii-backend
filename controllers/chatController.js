const Chat = require('../models/Chat');
const User = require('../models/User');
const Notification = require('../models/Notification');
const crypto = require('crypto');

const generateSessionId = () => {
  return crypto.randomBytes(16).toString('hex');
};

exports.startChat = async (req, res) => {
  try {
    const { name, email, phone, userId } = req.body;
    const sessionId = generateSessionId();

    const chatSession = await Chat.create({
      sessionId,
      userId: userId || null,
      userInfo: { name, email, phone },
      status: 'pending',
      lastMessageAt: new Date(),
    });

    const admins = await User.find({ role: 'admin' });
    await Promise.all(admins.map(admin => Notification.create({
      userId: admin._id,
      title: 'New Customer Chat Request',
      message: `${name} started a new chat request.`,
      type: 'system',
      priority: 'high',
      data: {
        sessionId: chatSession.sessionId,
        chatId: chatSession._id,
      },
    })));

    res.status(201).json({
      success: true,
      sessionId: chatSession.sessionId,
      chatId: chatSession._id,
    });
  } catch (error) {
    console.error('Chat start error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { sessionId, message, attachments, senderType, userId } = req.body;

    const chat = await Chat.findOne({ sessionId });
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found',
      });
    }

    const messageObj = {
      senderId: userId || null,
      senderType: senderType || 'customer',
      message,
      attachments: attachments || [],
      createdAt: new Date(),
    };

    chat.messages.push(messageObj);
    chat.lastMessageAt = new Date();
    if (senderType !== 'admin') {
      chat.unreadCount += 1;
    }
    if (senderType === 'customer' && chat.status === 'pending') {
      chat.status = 'active';
    }

    await chat.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${sessionId}`).emit('new_message', {
        message: messageObj,
        sessionId,
      });

      const admins = await User.find({ role: 'admin' });
      admins.forEach(admin => {
        io.to(`admin_${admin._id}`).emit('new_chat_message', {
          sessionId,
          userInfo: chat.userInfo,
          message: messageObj,
        });
      });
    }

    if (senderType !== 'admin') {
      const admins = await User.find({ role: 'admin' });
      await Promise.all(admins.map(admin => Notification.create({
        userId: admin._id,
        title: 'New Support Message',
        message: `${chat.userInfo.name} sent a new support message.`,
        type: 'system',
        priority: 'high',
        data: {
          sessionId,
          chatId: chat._id,
        },
      })));
    }

    res.status(200).json({
      success: true,
      message: 'Message sent',
      data: messageObj,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const chat = await Chat.findOne({ sessionId });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    chat.messages.forEach(msg => {
      if (!msg.isRead && msg.senderType !== 'admin') {
        msg.isRead = true;
        msg.readAt = new Date();
      }
    });
    chat.unreadCount = 0;
    await chat.save();

    res.status(200).json({ success: true, chat });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminChats = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const chats = await Chat.find(query)
      .sort({ lastMessageAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Chat.countDocuments(query);
    const totalUnread = await Chat.aggregate([
      { $match: { unreadCount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$unreadCount' } } }
    ]);

    res.status(200).json({
      success: true,
      chats,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      totalUnread: totalUnread[0]?.total || 0,
    });
  } catch (error) {
    console.error('Get admin chats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resolveChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const chat = await Chat.findOne({ sessionId });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    chat.status = 'resolved';
    chat.resolvedAt = new Date();
    chat.resolvedBy = req.user.id;
    await chat.save();

    res.status(200).json({ success: true, message: 'Chat resolved' });
  } catch (error) {
    console.error('Resolve chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
