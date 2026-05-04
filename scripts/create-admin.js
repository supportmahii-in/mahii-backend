const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
require('dotenv').config();

// Use public DNS servers for Atlas SRV resolution (same as server)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('../models/User');

const createAdmin = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    const mongoHost = process.env.MONGODB_URI.split('@')[1]?.split('/')[0] || 'MongoDB';
    console.log(`✅ MongoDB Connected: ${mongoHost}`);

    console.log('🔍 Checking for existing admin...');
    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('⚠️  Admin already exists!');
      console.log('Email:', adminExists.email);
      process.exit();
    }

    console.log('👤 Creating admin user...');
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@mahii.dev',
      phone: '9999999999',
      password: 'NewAdmin@2026!',
      role: 'admin',
      isVerified: true,
      isApproved: true
    });

    console.log('✅ Admin created successfully!');
    console.log('💫 Email: admin@mahii.dev');
    console.log('🔒 Password: NewAdmin@2026!');
    console.log('⚠️  Please change password after first login!');

    process.exit();
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

createAdmin();