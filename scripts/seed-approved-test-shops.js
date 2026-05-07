const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Use public DNS servers for Atlas SRV resolution (same as server)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('../models/User');
const Shop = require('../models/Shop');
const Product = require('../models/Product');

const shopsToSeed = [
  {
    owner: {
      name: 'Cafe Test Owner',
      email: 'test.cafe.owner@mahii.com',
      phone: '9999999901',
      password: 'Test@123456',
      role: 'shopowner',
    },
    shop: {
      name: 'Caffeine Corner',
      category: 'cafe',
      description: 'Cozy café serving fresh coffee, sandwiches, and snacks.',
      location: {
        city: 'Pune',
        area: 'Koregaon Park',
        address: '12 Coffee Street, Koregaon Park',
        lat: 18.5360,
        lng: 73.9024,
      },
      contactNumber: '9123456780',
      costForTwo: 450,
      timings: { open: '08:00', close: '22:00', isOpen: true },
      pureVeg: false,
      products: [
        { name: 'Cappuccino', price: 120, category: 'beverages', veg: true },
        { name: 'Blueberry Muffin', price: 90, category: 'desserts', veg: true },
        { name: 'Veg Sandwich', price: 150, category: 'snacks', veg: true },
      ],
    },
  },
  {
    owner: {
      name: 'Hotel Test Owner',
      email: 'test.hotel.owner@mahii.com',
      phone: '9999999902',
      password: 'Test@123456',
      role: 'shopowner',
    },
    shop: {
      name: 'Heritage Hotel',
      category: 'hotel',
      description: 'Comfortable hotel with multi-cuisine dining and room service.',
      location: {
        city: 'Pune',
        area: 'Baner',
        address: '45 Stay Lane, Baner',
        lat: 18.5602,
        lng: 73.7801,
      },
      contactNumber: '9123456781',
      costForTwo: 600,
      timings: { open: '07:00', close: '23:00', isOpen: true },
      pureVeg: false,
      products: [
        { name: 'Paneer Butter Masala', price: 220, category: 'main-course', veg: true },
        { name: 'Chicken Biryani', price: 260, category: 'main-course', veg: false },
        { name: 'Gulab Jamun', price: 80, category: 'desserts', veg: true },
      ],
    },
  },
  {
    owner: {
      name: 'Mess Test Owner',
      email: 'test.mess.owner@mahii.com',
      phone: '9999999903',
      password: 'Test@123456',
      role: 'shopowner',
    },
    shop: {
      name: 'Campus Mess',
      category: 'mess',
      description: 'Student-friendly mess with affordable thalis and daily specials.',
      location: {
        city: 'Pune',
        area: 'Tilak Road',
        address: '90 College Road, Tilak Road',
        lat: 18.5204,
        lng: 73.8415,
      },
      contactNumber: '9123456782',
      costForTwo: 280,
      timings: { open: '06:30', close: '21:00', isOpen: true },
      pureVeg: true,
      products: [
        { name: 'Veg Thali', price: 100, category: 'lunch', veg: true },
        { name: 'Sambar Rice', price: 80, category: 'dinner', veg: true },
        { name: 'Lassi', price: 50, category: 'beverages', veg: true },
      ],
    },
  },
  {
    owner: {
      name: 'Dessert Test Owner',
      email: 'test.dessert.owner@mahii.com',
      phone: '9999999904',
      password: 'Test@123456',
      role: 'shopowner',
    },
    shop: {
      name: 'Sweet Treats',
      category: 'dessert',
      description: 'Delicious desserts, cakes, and shakes for every sweet tooth.',
      location: {
        city: 'Pune',
        area: 'Model Colony',
        address: '101 Dessert Avenue, Model Colony',
        lat: 18.5154,
        lng: 73.8390,
      },
      contactNumber: '9123456783',
      costForTwo: 320,
      timings: { open: '10:00', close: '22:30', isOpen: true },
      pureVeg: true,
      products: [
        { name: 'Chocolate Brownie', price: 120, category: 'desserts', veg: true },
        { name: 'Strawberry Shake', price: 140, category: 'beverages', veg: true },
        { name: 'Cheesecake Slice', price: 180, category: 'desserts', veg: true },
      ],
    },
  },
  {
    owner: {
      name: 'Stall Test Owner',
      email: 'test.stall.owner@mahii.com',
      phone: '9999999905',
      password: 'Test@123456',
      role: 'shopowner',
    },
    shop: {
      name: 'Street Stall',
      category: 'stall',
      description: 'Popular street-food stall with quick bites and affordable prices.',
      location: {
        city: 'Pune',
        area: 'Shaniwar Peth',
        address: '7 Stall Bazaar, Shaniwar Peth',
        lat: 18.5134,
        lng: 73.8544,
      },
      contactNumber: '9123456784',
      costForTwo: 180,
      timings: { open: '11:00', close: '21:30', isOpen: true },
      pureVeg: false,
      products: [
        { name: 'Vada Pav', price: 40, category: 'snacks', veg: true },
        { name: 'Pav Bhaji', price: 90, category: 'lunch', veg: true },
        { name: 'Chicken Frankie', price: 120, category: 'snacks', veg: false },
      ],
    },
  },
];

const seedShops = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const emails = shopsToSeed.map(({ owner }) => owner.email);
    const shopNames = shopsToSeed.map(({ shop }) => shop.name);

    await User.deleteMany({ email: { $in: emails } });
    await Shop.deleteMany({ name: { $in: shopNames } });
    console.log('🧹 Removed existing test shop users and shops if present');

    for (const item of shopsToSeed) {
      const ownerData = {
        ...item.owner,
        isVerified: true,
        isApproved: true,
        approvalStatus: 'approved',
      };

      const owner = new User(ownerData);
      await owner.save();
      console.log(`✅ Created shop owner: ${owner.email}`);

      const shopData = {
        ...item.shop,
        ownerId: owner._id,
        isActive: true,
        isApproved: true,
        approvedAt: new Date(),
      };

      const shop = await Shop.create(shopData);
      console.log(`✅ Created approved shop: ${shop.name}`);

      for (const product of item.shop.products) {
        await Product.create({
          name: product.name,
          price: product.price,
          category: product.category,
          shopId: shop._id,
          description: `${product.name} from ${shop.name}`,
          veg: product.veg,
          isPopular: product.isPopular || false,
        });
      }

      console.log(`🛒 Created ${item.shop.products.length} products for ${shop.name}`);
    }

    const testCustomerEmail = 'test.customer@mahii.com';
    const existingCustomer = await User.findOne({ email: testCustomerEmail });
    if (!existingCustomer) {
      const customer = await User.create({
        name: 'Test Customer',
        email: testCustomerEmail,
        phone: '9999999910',
        password: 'Test@123456',
        role: 'customer',
        isVerified: true,
        isApproved: true,
      });
      console.log(`✅ Created test customer: ${customer.email}`);
    } else {
      console.log(`⚠️  Test customer already exists: ${existingCustomer.email}`);
    }

    console.log('\n🎉 All approved test shops have been seeded successfully!');
    console.log('You can now open the explore page and see the new cafes, hotel, mess, dessert, and stall shops.');
    console.log('Test customer credentials: test.customer@mahii.com / Test@123456');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed approved test shops:', error);
    process.exit(1);
  }
};

seedShops();
