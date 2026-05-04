const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
require('dotenv').config();

// Use public DNS servers for Atlas SRV resolution (same as server)
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Import models
const User = require('../models/User');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');

const testData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create Test Customer
    console.log('\n📝 Creating test customer...');
    await User.findOneAndDelete({ email: 'test.customer@mahii.com' });
    const customer = await User.create({
      name: 'Test Customer',
      email: 'test.customer@mahii.com',
      phone: '9999999991',
      password: 'Test@123456',
      role: 'customer',
      isVerified: true,
      isApproved: true,
    });
    console.log('✅ Customer created:', customer.email);

    // 2. Create Test Shop Owner
    console.log('\n📝 Creating test shop owner...');
    // Delete existing user first to ensure clean creation
    await User.findOneAndDelete({ email: 'test.shop@mahii.com' });
    
    const shopOwner = new User({
      name: 'Test Shop Owner',
      email: 'test.shop@mahii.com',
      phone: '9999999992',
      password: 'Test@123456',
      role: 'shopowner',
      isVerified: true,
      isApproved: true,
    });
    await shopOwner.save();
    console.log('✅ Shop owner created:', shopOwner.email);

    // 3. Create Test Shop
    console.log('\n📝 Creating test shop...');
    const shop = await Shop.findOneAndUpdate(
      { ownerId: shopOwner._id },
      {
        name: 'Student\'s Delight Mess',
        ownerId: shopOwner._id,
        category: 'mess',
        description: 'Best mess for students near Pune University',
        location: {
          city: 'Pune',
          area: 'Shivaji Nagar',
          address: 'FC Road, Near Pune University',
          lat: 18.5204,
          lng: 73.8567,
        },
        timings: { open: '08:00', close: '22:00' },
        rating: 4.5,
        pureVeg: true,
        contactNumber: '9876543210',
        isActive: true,
        costForTwo: 300,
      },
      { upsert: true, new: true }
    );
    console.log('✅ Shop created:', shop.name);

    // 4. Create Test Products
    console.log('\n📝 Creating test products...');
    const products = [
      { name: 'Masala Dosa', price: 80, category: 'breakfast', veg: true, isPopular: true },
      { name: 'Poha', price: 40, category: 'breakfast', veg: true },
      { name: 'Veg Thali', price: 120, category: 'lunch', veg: true, isPopular: true },
      { name: 'Butter Chicken', price: 250, category: 'dinner', veg: false },
      { name: 'Cold Coffee', price: 60, category: 'beverages', veg: true },
    ];

    for (const productData of products) {
      await Product.findOneAndUpdate(
        { name: productData.name, shopId: shop._id },
        { ...productData, shopId: shop._id, description: `Delicious ${productData.name}` },
        { upsert: true }
      );
    }
    console.log('✅ Products created:', products.length);

    // 5. Create Test Subscription
    console.log('\n📝 Creating test subscription...');
    const subscription = await Subscription.findOneAndUpdate(
      { userId: customer._id, shopId: shop._id },
      {
        userId: customer._id,
        shopId: shop._id,
        planType: 'monthly',
        planName: 'Monthly Plan',
        price: 2500,
        mealsPerDay: 2,
        totalMeals: 60,
        mealsRemaining: 60,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log('✅ Subscription created:', subscription.planName);

    // 6. Create Test Order
    console.log('\n📝 Creating test order...');
    const product = await Product.findOne({ shopId: shop._id });
    if (product) {
      const order = await Order.create({
        userId: customer._id,
        shopId: shop._id,
        items: [{
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 2,
          totalPrice: product.price * 2,
        }],
        subtotal: product.price * 2,
        deliveryCharge: 40,
        tax: (product.price * 2) * 0.05,
        total: (product.price * 2) + 40 + ((product.price * 2) * 0.05),
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        deliveryAddress: {
          street: 'FC Road',
          city: 'Pune',
          pincode: '411001',
        },
      });
      console.log('✅ Order created:', order._id);
    }

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║         ✅ TEST DATA CREATED SUCCESSFULLY!                ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('\n📋 Test Credentials:');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ CUSTOMER LOGIN:                                          │');
    console.log('│   Email: test.customer@mahii.com                    │');
    console.log('│   Password: Test@123456                                  │');
    console.log('├────────────────────────────────────────────────────────│');
    console.log('│ SHOP OWNER LOGIN:                                        │');
    console.log('│   Email: test.shop@mahii.com                        │');
    console.log('│   Password: Test@123456                                  │');
    console.log('├────────────────────────────────────────────────────────│');
    console.log('│ ADMIN LOGIN (Create manually or use existing):          │');
    console.log('│   Email: admin@mahii.dev                            │');
    console.log('│   Password: NewAdmin@2026!                                 │');
    console.log('└─────────────────────────────────────────────────────────┘');

    process.exit();
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
};

testData();