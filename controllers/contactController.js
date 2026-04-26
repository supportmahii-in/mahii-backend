const Contact = require('../models/Contact');

// @desc    Submit contact form
// @route   POST /api/contact/submit
// @access  Public
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message, attachment } = req.body;
    
    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
      attachment,
    });
    
    // Send email notification to admin (optional)
    // await sendEmail({
    //   to: process.env.ADMIN_EMAIL,
    //   subject: `New Contact: ${subject}`,
    //   html: `<p>From: ${name} (${email})</p><p>Message: ${message}</p>`,
    // });
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully. We will get back to you soon.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all contact messages (Admin)
// @route   GET /api/contact
// @access  Private (Admin only)
exports.getMessages = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    
    const messages = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Contact.countDocuments(query);
    
    res.status(200).json({
      success: true,
      messages,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update message status (Admin)
// @route   PUT /api/contact/:id
// @access  Private (Admin only)
exports.updateMessageStatus = async (req, res) => {
  try {
    const { status, adminReply } = req.body;
    
    const message = await Contact.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }
    
    message.status = status;
    if (adminReply) {
      message.adminReply = {
        message: adminReply,
        repliedAt: new Date(),
      };
    }
    
    await message.save();
    
    res.status(200).json({
      success: true,
      message: 'Message updated',
      contact: message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};