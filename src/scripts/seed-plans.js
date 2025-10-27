import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Plan from '../models/Plan.js';

// Load environment variables
dotenv.config();

/**
 * Script tạo dữ liệu plans mẫu
 * Chạy: node src/scripts/seed-plans.js
 */

const plans = [
  {
    name: 'Free Plan',
    price: 0,
    trip_limit: 3,
    message_limit: 5,
    description: 'Gói miễn phí với các tính năng cơ bản',
    features: [
      'Tạo tối đa 3 chuyến du lịch',
      'Chat tối đa 5 lần',
      'Hỗ trợ cơ bản',
      'Truy cập các điểm đến phổ biến'
    ],
    type: 'free',
    duration: 30,
    isActive: true,
    displayOrder: 1
  },
  {
    name: 'Premium Plan',
    price: 199000,
    trip_limit: 20,
    message_limit: 0,
    description: 'Gói premium với nhiều tính năng nâng cao',
    features: [
      'Tạo tối đa 20 chuyến du lịch',
      'Chat không giới hạn',
      'Hỗ trợ ưu tiên',
      'Truy cập tất cả điểm đến',
      'Tính năng AI nâng cao',
      'Xuất báo cáo chi tiết'
    ],
    type: 'premium',
    duration: 30,
    isActive: true,
    displayOrder: 2
  },
  {
    name: 'Pro Plan',
    price: 499000,
    trip_limit: 0, // Unlimited
    message_limit: 0, // Unlimited
    description: 'Gói pro với tất cả tính năng không giới hạn',
    features: [
      'Tạo không giới hạn chuyến du lịch',
      'Gửi không giới hạn tin nhắn',
      'Hỗ trợ 24/7',
      'Truy cập tất cả điểm đến',
      'Tính năng AI cao cấp',
      'API access',
      'Tùy chỉnh nâng cao',
      'Xuất báo cáo chuyên nghiệp'
    ],
    type: 'pro',
    duration: 30,
    isActive: true,
    displayOrder: 3
  }
];

async function seedPlans() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️ Clearing existing plans...');
    await Plan.deleteMany({});
    console.log('✅ Existing plans cleared');

    console.log('🌱 Seeding plans...');
    for (const planData of plans) {
      const plan = new Plan(planData);
      await plan.save();
      console.log(`✅ Created plan: ${plan.name} (${plan.type}) - ${plan.price} VND`);
    }

    console.log('🎉 Plans seeded successfully!');
    
    // Display summary
    const allPlans = await Plan.find({});
    console.log('\n📋 Summary of created plans:');
    allPlans.forEach(plan => {
      console.log(`- ${plan.name}: ${plan.price} VND (${plan.type})`);
      console.log(`  Trips: ${plan.trip_limit === 0 ? 'Unlimited' : plan.trip_limit}`);
      console.log(`  Messages: ${plan.message_limit === 0 ? 'Unlimited' : plan.message_limit}`);
      console.log(`  Duration: ${plan.duration} days`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error seeding plans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Chạy script
seedPlans();
