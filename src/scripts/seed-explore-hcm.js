import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import Place from '../models/Place.js';

dotenv.config();

const hcmPlaces = [
  {
    name: 'Independence Palace',
    address: '135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    description: 'Dinh Độc Lập – di tích lịch sử nổi tiếng tại trung tâm Sài Gòn.',
    tags: ['attraction', 'history', 'museum'],
    location: { lat: 10.777182, lng: 106.695365 },
    category: 'attraction',
    images: ['https://images.unsplash.com/photo-1506806732259-39c2d0268443?q=80&w=1080&auto=format&fit=crop'],
    rating: { average: 4.4, count: 12000 }
  },
  {
    name: 'Notre Dame Cathedral of Saigon',
    address: '01 Công xã Paris, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    description: 'Nhà thờ Đức Bà – biểu tượng kiến trúc Pháp tại Sài Gòn.',
    tags: ['attraction', 'church', 'architecture'],
    location: { lat: 10.779783, lng: 106.699018 },
    category: 'attraction',
    images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1080&auto=format&fit=crop'],
    rating: { average: 4.6, count: 18000 }
  },
  {
    name: 'Ben Thanh Market',
    address: 'Lê Lợi, Bến Thành, Quận 1, TP. Hồ Chí Minh',
    description: 'Chợ Bến Thành – chợ lâu đời và nổi tiếng nhất ở Sài Gòn.',
    tags: ['shopping', 'market', 'food'],
    location: { lat: 10.772311, lng: 106.698139 },
    category: 'shopping',
    images: ['https://images.unsplash.com/photo-1508057198894-247b23fe5ade?q=80&w=1080&auto=format&fit=crop'],
    rating: { average: 4.0, count: 25000 }
  },
  {
    name: 'War Remnants Museum',
    address: '28 Võ Văn Tần, Phường 6, Quận 3, TP. Hồ Chí Minh',
    description: 'Bảo tàng Chứng tích Chiến tranh – nơi lưu giữ lịch sử.',
    tags: ['museum', 'history'],
    location: { lat: 10.779983, lng: 106.692221 },
    category: 'historical',
    images: ['https://images.unsplash.com/photo-1543357530-d91dab30fa3a?q=80&w=1080&auto=format&fit=crop'],
    rating: { average: 4.5, count: 21000 }
  },
  {
    name: 'Saigon Skydeck',
    address: 'Bitexco Financial Tower, 36 Hồ Tùng Mậu, Quận 1, TP. Hồ Chí Minh',
    description: 'Đài quan sát ngắm toàn cảnh Sài Gòn từ tòa tháp Bitexco.',
    tags: ['viewpoint', 'cityscape'],
    location: { lat: 10.772975, lng: 106.704886 },
    category: 'attraction',
    images: ['https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=1080&auto=format&fit=crop'],
    rating: { average: 4.4, count: 9000 }
  },
  {
    name: 'HCMC History Museum',
    address: '2 Nguyễn Bỉnh Khiêm, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    description: 'Bảo tàng Lịch sử TP.HCM – trưng bày hiện vật văn hóa Việt Nam.',
    tags: ['museum', 'culture'],
    location: { lat: 10.787045, lng: 106.705844 },
    category: 'cultural',
    images: ['https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=1080&auto=format&fit=crop'],
    rating: { average: 4.4, count: 6000 }
  }
];

const main = async () => {
  await connectDB();
  console.log('🚀 Seeding HCMC places for Explore...');
  try {
    const ops = hcmPlaces.map((p) => ({ updateOne: { filter: { name: p.name, address: p.address }, update: { $set: p }, upsert: true } }));
    const result = await Place.bulkWrite(ops, { ordered: false });
    console.log('✅ Seed completed:', JSON.stringify(result.ok ? result : result, null, 2));
  } catch (e) {
    console.error('❌ Seed error:', e.message);
  } finally {
    process.exit(0);
  }
};

main();


