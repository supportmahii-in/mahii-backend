const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const shopRoutes = require('./routes/shopRoutes');
const productRoutes = require('./routes/productRoutes');  // ADD THIS
const orderRoutes = require('./routes/orderRoutes');      // ADD THIS
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const contactRoutes = require('./routes/contactRoutes');
const locationRoutes = require('./routes/locationRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');

// Connect to database
connectDB();

const app = express();

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join shop room for real-time notifications
  socket.on('join_shop', (shopOwnerId) => {
    socket.join(`shop_${shopOwnerId}`);
    console.log(`Shop owner ${shopOwnerId} joined room`);
  });

  // Join customer room
  socket.on('join_customer', (customerId) => {
    socket.join(`customer_${customerId}`);
    console.log(`Customer ${customerId} joined room`);
  });

  socket.on('join_chat', (sessionId) => {
    socket.join(`chat_${sessionId}`);
    console.log(`User joined chat room ${sessionId}`);
  });

  socket.on('join_admin', (adminId) => {
    socket.join(`admin_${adminId}`);
    console.log(`Admin ${adminId} joined admin room`);
  });

  socket.on('typing', ({ sessionId, isTyping }) => {
    if (!sessionId) return;
    socket.to(`chat_${sessionId}`).emit('typing', { sessionId, isTyping });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid blocking API requests
}));
app.use(cors());
// Body parser middleware (already there)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: 'connected'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);  // ADD THIS
app.use('/api/orders', orderRoutes);      // ADD THIS
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chats', chatRoutes);

// Test route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Mahii API v1.0',
    endpoints: {
      auth: {
        customerRegister: 'POST /api/auth/customer/register',
        shopOwnerRegister: 'POST /api/auth/shopowner/register',
        login: 'POST /api/auth/login',
        adminLogin: 'POST /api/auth/admin/login',
        getMe: 'GET /api/auth/me'
      },
      shops: {
        nearby: 'GET /api/shops/nearby?lat=&lng=&radius=10',
        getById: 'GET /api/shops/:id',
        create: 'POST /api/shops'
      }
    }
  });
});

// Test root route
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Mahii API is running!',
    data: {
      version: '1.0.0',
      status: 'active'
    }
  });
});

// Test database route
app.get('/api/test-db', async (req, res) => {
  try {
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    res.json({ 
      success: true, 
      message: 'Database connected!',
      userCount: userCount 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Test the API: http://localhost:${PORT}`);
  console.log(`🗄️ Database: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
  console.log(`🔌 Socket.IO: Enabled`);
  console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});