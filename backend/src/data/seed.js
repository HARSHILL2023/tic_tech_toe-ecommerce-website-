import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import PriceHistory from '../models/PriceHistory.js';

// ── Verified Unsplash URLs ────────────────────────────────────────────
const U = (id) => `https://images.unsplash.com/photo-${id}?w=500&q=80`;

const CATEGORIES = [
  'Electronics', 'Fashion', 'Home & Kitchen', 'Sports', 'Beauty', 'Books',
  'Gaming', 'Toys', 'Automotive', 'Appliances', 'Furniture', 'Food & Grocery'
];

const BRANDS = {
  'Electronics': ['Sony', 'Samsung', 'Apple', 'Xiaomi', 'boAt', 'LG', 'Dell'],
  'Fashion': ['Nike', "Levi's", 'Puma', 'Adidas', 'Zara', 'H&M'],
  'Home & Kitchen': ['Instant Pot', 'Dyson', 'Prestige', 'Philips', 'KitchenAid'],
  'Sports': ['Adidas', 'Liforme', 'Boldfit', 'Decathlon', 'Yonex'],
  'Beauty': ['Maybelline', "L'Oreal", 'Nykaa', 'Clinique', 'The Body Shop'],
  'Books': ['James Clear', 'Morgan Housel', 'Robert Kiyosaki', 'Yuval Noah Harari'],
  'Gaming': ['Razer', 'Logitech', 'SteelSeries', 'Secretlab', 'ASUS ROG', 'MSI'],
  'Toys': ['LEGO', 'Hasbro', 'Mattel', 'Funskool', 'Hot Wheels'],
  'Automotive': ['Bosch', '3M', 'Goodyear', 'GoMechanic', 'Pioneer'],
  'Appliances': ['Pigeon', 'Bajaj', 'Morphy Richards', 'Kent', 'Havells'],
  'Furniture': ['IKEA', 'Sleepyhead', 'Wakefit', 'Home Centre', 'Godrej Interio'],
  'Food & Grocery': ['MuscleBlaze', 'Tata Tea', 'Nescafe', 'Happilo', 'Kellogg\'s']
};

const baseProducts = [
  { name: 'Headphones', category: 'Electronics', priceRange: [1500, 35000] },
  { name: 'Smartwatch', category: 'Electronics', priceRange: [2000, 45000] },
  { name: 'Smartphone', category: 'Electronics', priceRange: [10000, 150000] },
  { name: 'TV', category: 'Electronics', priceRange: [15000, 250000] },
  { name: 'T-Shirt', category: 'Fashion', priceRange: [499, 2999] },
  { name: 'Jeans', category: 'Fashion', priceRange: [999, 5999] },
  { name: 'Running Shoes', category: 'Fashion', priceRange: [1999, 15999] },
  { name: 'Mixer Grinder', category: 'Home & Kitchen', priceRange: [2500, 8000] },
  { name: 'Vacuum Cleaner', category: 'Home & Kitchen', priceRange: [5000, 50000] },
  { name: 'Pressure Cooker', category: 'Home & Kitchen', priceRange: [1200, 6000] },
  { name: 'Yoga Mat', category: 'Sports', priceRange: [499, 5000] },
  { name: 'Dumbbell Set', category: 'Sports', priceRange: [999, 15000] },
  { name: 'Cricket Bat', category: 'Sports', priceRange: [1500, 25000] },
  { name: 'Foundation', category: 'Beauty', priceRange: [399, 3500] },
  { name: 'Serum', category: 'Beauty', priceRange: [599, 4500] },
  { name: 'Lipstick', category: 'Beauty', priceRange: [299, 2500] },
  { name: 'Self-help Book', category: 'Books', priceRange: [299, 999] },
  { name: 'Finance Book', category: 'Books', priceRange: [299, 999] },
  { name: 'Gaming Chair', category: 'Gaming', priceRange: [10000, 45000] },
  { name: 'Gaming Headset', category: 'Gaming', priceRange: [2000, 25000] },
  { name: 'Gaming Mouse', category: 'Gaming', priceRange: [999, 12000] },
  { name: 'Mechanical Keyboard', category: 'Gaming', priceRange: [2500, 20000] },
  { name: 'Gaming Monitor', category: 'Gaming', priceRange: [12000, 80000] },
  { name: 'LEGO Set', category: 'Toys', priceRange: [999, 50000] },
  { name: 'Board Game', category: 'Toys', priceRange: [499, 5000] },
  { name: 'Remote Control Car', category: 'Toys', priceRange: [1200, 10000] },
  { name: 'Puzzle', category: 'Toys', priceRange: [299, 2500] },
  { name: 'Doll', category: 'Toys', priceRange: [499, 5000] },
  { name: 'Car Air Freshener', category: 'Automotive', priceRange: [199, 999] },
  { name: 'Seat Covers', category: 'Automotive', priceRange: [2500, 15000] },
  { name: 'Phone Holder', category: 'Automotive', priceRange: [399, 1999] },
  { name: 'Car Wax', category: 'Automotive', priceRange: [499, 3500] },
  { name: 'Air Fryer', category: 'Appliances', priceRange: [4500, 15000] },
  { name: 'Blender', category: 'Appliances', priceRange: [1500, 6000] },
  { name: 'Toaster', category: 'Appliances', priceRange: [999, 4000] },
  { name: 'Electric Kettle', category: 'Appliances', priceRange: [799, 3500] },
  { name: 'Iron', category: 'Appliances', priceRange: [599, 4500] },
  { name: 'Study Table', category: 'Furniture', priceRange: [2500, 15000] },
  { name: 'Bean Bag', category: 'Furniture', priceRange: [999, 4500] },
  { name: 'Bookshelf', category: 'Furniture', priceRange: [3000, 25000] },
  { name: 'Office Chair', category: 'Furniture', priceRange: [4500, 35000] },
  { name: 'Floor Lamp', category: 'Furniture', priceRange: [1200, 8000] },
  { name: 'Protein Powder', category: 'Food & Grocery', priceRange: [1500, 8000] },
  { name: 'Snack Pack', category: 'Food & Grocery', priceRange: [199, 1200] },
  { name: 'Premium Tea', category: 'Food & Grocery', priceRange: [250, 2500] },
  { name: 'Coffee Beans', category: 'Food & Grocery', priceRange: [400, 3500] },
  { name: 'Dry Fruits Mix', category: 'Food & Grocery', priceRange: [500, 4500] }
];

const IMAGE_IDS = [
  "1618366712010-f4ae9c647dcb", "1505740420928-5e560c06d30e", "1546435770-a3e426bf472b", "1583394838336-acd977736f90",
  "1593359677879-a4bb92f829e1", "1601944179066-29786cb9d32a", "1611532736597-de2d4265fba3", "1558618666-fcd25c85cd64",
  "1510557880182-3d4d3cba35a5", "1592750475338-74b7b21085ab", "1574755393849-623942496936", "1556656793-08538906a9f8",
  "1542291026-7eec264c27ff", "1608231387042-66d1773070a5", "1600185365483-26d7a4cc7519", "1595950653106-6c9ebd614d3a"
];

const generateProducts = (count = 210) => {
  const result = [];
  for (let i = 1; i <= count; i++) {
    const base = baseProducts[i % baseProducts.length];
    const categoryBrands = BRANDS[base.category];
    const brand = categoryBrands[Math.floor(Math.random() * categoryBrands.length)];
    const mrp = Math.round((Math.random() * (base.priceRange[1] - base.priceRange[0]) + base.priceRange[0]) / 10) * 10;
    const discountPercent = Math.floor(Math.random() * 25) + 5;
    const livePrice = Math.round((mrp * (1 - discountPercent / 100)) / 10) * 10;
    
    result.push({
      id: i,
      name: `${brand} ${base.name} Model ${String.fromCharCode(65 + (i % 26))}${i}`,
      brand: brand,
      category: base.category,
      mrp: mrp,
      livePrice: livePrice,
      basePrice: livePrice,
      stock: Math.floor(Math.random() * 148) + 2,
      restockDays: Math.floor(Math.random() * 14) + 1,
      rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
      reviewCount: Math.floor(Math.random() * 2000) + 10,
      discount: discountPercent,
      priceReason: 'Standard Price',
      demandBadge: null,
      images: [0, 1, 2, 3].map(offset => U(IMAGE_IDS[(i + offset) % IMAGE_IDS.length])),
      description: `Premium ${base.name} by ${brand}. Experience top-tier quality and exceptional performance with this state-of-the-art ${base.category.toLowerCase()} hardware. Designed for both durability and style.`,
      specs: {
        'Quality': 'Premium',
        'Material': 'High-grade',
        'Warranty': '1 Year',
        'Origin': 'India'
      }
    });
  }
  return result;
};

const products = generateProducts(215);

export async function runSeed() {
  const count = await Product.countDocuments();
  if (count > 0) {
    console.log(`✅ Products already in DB (${count}) — skipping seed`);
    return;
  }
  console.log('🌱 No products found — seeding...');
  const created = await Product.insertMany(
    products.map(p => ({ ...p, basePrice: p.livePrice, specs: p.specs instanceof Map ? Object.fromEntries(p.specs) : p.specs, viewCount: Math.floor(Math.random() * 5000), sessionPrices: new Map() }))
  );
  console.log(`✅ Seeded ${created.length} products with Amazon + Flipkart CDN images`);
  const priceHistoryDocs = [];
  for (const p of created) {
    for (let i = 23; i >= 0; i--) {
      const fluctuation = 1 + (Math.random() - 0.5) * 0.15;
      priceHistoryDocs.push({ productId: p.id, price: Math.round(p.livePrice * fluctuation), timestamp: new Date(Date.now() - i * 3600000) });
    }
  }
  await PriceHistory.deleteMany({});
  await PriceHistory.insertMany(priceHistoryDocs);
  console.log(`✅ Seeded price history for ${created.length} products`);
}

// ── Standalone CLI: node src/data/seed.js ────────────────────────────────────
// Force-reseeds all products (clears existing)
async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    await Product.deleteMany({});
    await PriceHistory.deleteMany({});
    console.log('Cleared existing data');
    await runSeed();
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected. Seed complete!');
  }
}

// Only run standalone when called directly (not imported)
if (process.argv[1] && process.argv[1].includes('seed.js')) {
  seed();
}
