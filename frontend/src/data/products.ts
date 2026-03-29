export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  mrp: number;
  livePrice: number;
  stock: number;
  rating: number;
  reviewCount: number;
  discount: number;
  priceReason: "High Demand" | "Limited Stock" | "Competitor Match" | "Standard Price";
  demandBadge: string | null;
  images: string[];
  description: string;
  specs: Record<string, string>;
}

// ── Verified Unsplash image URLs (no hotlink protection, always load) ─────────
// Format: https://images.unsplash.com/photo-{ID}?w=500&q=80
const U = (id: string, alt?: string) =>
  `https://images.unsplash.com/photo-${id}?w=500&q=80${alt ? `&sig=${alt}` : ""}`;

const IMGS: Record<number, string[]> = {
  // 1. Sony WH-1000XM5 Headphones
  1: [
    U("1618366712010-f4ae9c647dcb"),
    U("1505740420928-5e560c06d30e"),
    U("1546435770-a3e426bf472b"),
    U("1583394838336-acd977736f90"),
  ],
  // 2. Samsung 65" 4K QLED TV
  2: [
    U("1593359677879-a4bb92f829e1"),
    U("1601944179066-29786cb9d32a"),
    U("1611532736597-de2d4265fba3"),
    U("1558618666-fcd25c85cd64"),
  ],
  // 3. Apple iPhone 15
  3: [
    U("1510557880182-3d4d3cba35a5"),
    U("1592750475338-74b7b21085ab"),
    U("1574755393849-623942496936"),
    U("1556656793-08538906a9f8"),
  ],
  // 4. Nike Air Max 270
  4: [
    U("1542291026-7eec264c27ff"),
    U("1608231387042-66d1773070a5"),
    U("1600185365483-26d7a4cc7519"),
    U("1595950653106-6c9ebd614d3a"),
  ],
  // 5. Levi's 511 Slim Jeans
  5: [
    U("1542272604-787c3835535d"),
    U("1555689502-c4b22d76c56f"),
    U("1541099649105-f69ad21f3246"),
    U("1475178626620-a4d074967452"),
  ],
  // 6. Instant Pot Duo 7-in-1
  6: [
    U("1585515320310-259814833e62"),
    U("1556909114-f6e7ad7d3136"),
    U("1590794056226-79ef3a8147e1"),
    U("1648462437588-e17d0b3d0484"),
  ],
  // 7. Dyson V15 Vacuum
  7: [
    U("1558618666-fcd25c85cd64"),
    U("1527515637462-cff94eecc1ac"),
    U("1625246333195-78d9c38ad449"),
    U("1584568694244-14fbdf83bd30"),
  ],
  // 8. Adidas Ultraboost 22
  8: [
    U("1543508282-6319a3e2621f"),
    U("1606107557195-0e29a4b5b4aa"),
    U("1491553895911-0055eca6402d"),
    U("1539185441755-769473a23570"),
  ],
  // 9. Yoga Mat Premium
  9: [
    U("1601925228209-27b9ad4c37e1"),
    U("1544367567-0f2fcb009e0b"),
    U("1518611012118-696072aa579a"),
    U("1575052814086-f385e2e2ad1b"),
  ],
  // 10. Maybelline Fit Me Foundation
  10: [
    U("1596462502278-27bfdc403348"),
    U("1522335789203-aabd1fc54bc9"),
    U("1631214524020-3c69f31ac7f9"),
    U("1583241475880-083f84372725"),
  ],
  // 11. L'Oreal Vitamin C Serum
  11: [
    U("1620916566398-39f1143ab7be"),
    U("1571781926291-c477ebfd024b"),
    U("1556228578-0d85b1a4d571"),
    U("1608248543803-ba4f8c70ae0b"),
  ],
  // 12. Atomic Habits
  12: [
    U("1544947950-fa07a98d237f"),
    U("1512820790803-83ca734da794"),
    U("1507842217343-583bb7270b66"),
    U("1481627834876-b7833e8f5570"),
  ],
  // 13. The Psychology of Money
  13: [
    U("1592496431122-2349e0fbc666"),
    U("1553729459-efe14ef6055d"),
    U("1579621970563-ebec7560ff3e"),
    U("1460925895917-afdab827c52f"),
  ],
  // 14. boAt Rockerz 450 Headphones
  14: [
    U("1613040809024-b4ef7ba99bc3"),
    U("1487215078519-e21cc028cb29"),
    U("1526170375885-4d8ecf77b99f"),
    U("1484704849700-f032a568e944"),
  ],
  // 15. Xiaomi Smart Band 8
  15: [
    U("1575311373937-040b8e1fd5b6"),
    U("1617043786394-f977fa12eddf"),
    U("1508685096489-7aacd43bd3b1"),
    U("1434494878577-86c23bcb06b9"),
  ],
  // 16. Puma T-Shirt Pack of 3
  16: [
    U("1521572163474-6864f9cf17ab"),
    U("1576566588028-4147f3842f27"),
    U("1583743814966-8936f5b7be1a"),
    U("1562157873-818bc0726f68"),
  ],
  // 17. Prestige Mixer Grinder
  17: [
    U("1507048331197-7d4ac70811cf"),
    U("1585515320310-259814833e62", "b"),
    U("1556909114-f6e7ad7d3136", "b"),
    U("1590794056226-79ef3a8147e1", "b"),
  ],
  // 18. Boldfit Dumbbell Set 20kg
  18: [
    U("1584735935682-2f2b69dff9d2"),
    U("1534438327276-14e5300c3a48"),
    U("1517963879433-6ad2b056d712"),
    U("1583454110551-21f2fa2afe61"),
  ],
  // 19. Nykaa Lip Kit
  19: [
    U("1586495777744-4e6232bf2e90"),
    U("1512207736890-6ffed8a84e8d"),
    U("1631214240010-a2a3c8cc1c7e"),
    U("1522335789203-aabd1fc54bc9", "b"),
  ],
  // 20. Rich Dad Poor Dad
  20: [
    U("1554224155-6726b3ff858f"),
    U("1579621970795-87facc2f976d"),
    U("1460925895917-afdab827c52f", "b"),
    U("1553729459-efe14ef6055d", "b"),
  ],
};

export const products: Product[] = [
  { id: 1, name: "Sony WH-1000XM5 Headphones", brand: "Sony", category: "Electronics", mrp: 29990, livePrice: 23499, stock: 8, rating: 4.7, reviewCount: 2341, discount: 22, priceReason: "High Demand", demandBadge: "High Demand", images: IMGS[1], description: "Industry-leading noise cancellation with Auto NC Optimizer. Crystal-clear hands-free calling with 4 beamforming microphones.", specs: { "Driver Size": "30mm", "Battery": "30 hours", "Weight": "250g", "Connectivity": "Bluetooth 5.2", "Noise Cancellation": "Active", "Charging": "USB-C" } },
  { id: 2, name: "Samsung 65\" 4K QLED TV", brand: "Samsung", category: "Electronics", mrp: 89990, livePrice: 74999, stock: 3, rating: 4.5, reviewCount: 876, discount: 17, priceReason: "Limited Stock", demandBadge: "Only 3 left", images: IMGS[2], description: "Quantum Dot technology delivers 100% Color Volume. Object Tracking Sound for immersive audio experience.", specs: { "Screen Size": "65 inches", "Resolution": "4K UHD", "HDR": "Quantum HDR", "Refresh Rate": "120Hz", "Smart TV": "Tizen OS", "Speakers": "20W" } },
  { id: 3, name: "Apple iPhone 15", brand: "Apple", category: "Electronics", mrp: 79900, livePrice: 71999, stock: 15, rating: 4.8, reviewCount: 5230, discount: 10, priceReason: "Competitor Match", demandBadge: "High Demand", images: IMGS[3], description: "Dynamic Island. 48MP camera with 2x Telephoto. A16 Bionic chip for exceptional performance.", specs: { "Display": "6.1\" Super Retina XDR", "Chip": "A16 Bionic", "Camera": "48MP Main", "Battery": "All-day", "Storage": "128GB", "5G": "Yes" } },
  { id: 4, name: "Nike Air Max 270", brand: "Nike", category: "Fashion", mrp: 12995, livePrice: 9499, stock: 22, rating: 4.4, reviewCount: 1890, discount: 27, priceReason: "Standard Price", demandBadge: null, images: IMGS[4], description: "The Nike Air Max 270 features Nike's biggest heel Air unit yet for a super-soft ride that feels as good as it looks.", specs: { "Upper": "Mesh & synthetic", "Sole": "Rubber", "Air Unit": "270 degrees", "Closure": "Lace-up", "Weight": "310g", "Style": "Lifestyle" } },
  { id: 5, name: "Levi's 511 Slim Jeans", brand: "Levi's", category: "Fashion", mrp: 3999, livePrice: 2799, stock: 45, rating: 4.3, reviewCount: 3420, discount: 30, priceReason: "Standard Price", demandBadge: null, images: IMGS[5], description: "Slim from hip to ankle, the 511 Slim Fit Jeans are a modern classic. Stretch denim for all-day comfort.", specs: { "Fit": "Slim", "Rise": "Mid-rise", "Material": "98% Cotton, 2% Elastane", "Wash": "Medium Indigo", "Closure": "Zip fly", "Care": "Machine washable" } },
  { id: 6, name: "Instant Pot Duo 7-in-1", brand: "Instant Pot", category: "Home & Kitchen", mrp: 8999, livePrice: 6499, stock: 6, rating: 4.6, reviewCount: 4567, discount: 28, priceReason: "Limited Stock", demandBadge: "Only 6 left", images: IMGS[6], description: "7-in-1 functionality: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker, and warmer.", specs: { "Capacity": "6 Quart", "Programs": "13 Smart Programs", "Material": "Stainless Steel", "Wattage": "1000W", "Pressure": "10.15-11.6 psi", "Safety": "10+ mechanisms" } },
  { id: 7, name: "Dyson V15 Vacuum", brand: "Dyson", category: "Home & Kitchen", mrp: 52900, livePrice: 44999, stock: 4, rating: 4.7, reviewCount: 892, discount: 15, priceReason: "Limited Stock", demandBadge: "Only 4 left", images: IMGS[7], description: "Laser reveals microscopic dust. Piezo sensor counts and sizes particles. HEPA filtration captures 99.99% of particles.", specs: { "Suction": "230 AW", "Runtime": "60 min", "Weight": "3.1kg", "Bin Volume": "0.76L", "Filtration": "HEPA", "Laser": "Green laser dust detection" } },
  { id: 8, name: "Adidas Ultraboost 22", brand: "Adidas", category: "Sports", mrp: 15999, livePrice: 11499, stock: 18, rating: 4.5, reviewCount: 2100, discount: 28, priceReason: "Competitor Match", demandBadge: null, images: IMGS[8], description: "Responsive BOOST midsole delivers incredible energy return. Primeknit upper adapts to the shape of your foot.", specs: { "Upper": "Primeknit", "Midsole": "BOOST", "Outsole": "Continental Rubber", "Drop": "10mm", "Weight": "320g", "Closure": "Lace-up" } },
  { id: 9, name: "Yoga Mat Premium", brand: "Liforme", category: "Sports", mrp: 2499, livePrice: 1799, stock: 67, rating: 4.2, reviewCount: 890, discount: 28, priceReason: "Standard Price", demandBadge: null, images: IMGS[9], description: "Eco-friendly natural rubber mat with alignment markings. Non-slip surface for all types of yoga practice.", specs: { "Material": "Natural Rubber", "Thickness": "6mm", "Size": "183x68cm", "Weight": "2.5kg", "Surface": "Non-slip", "Eco": "Biodegradable" } },
  { id: 10, name: "Maybelline Fit Me Foundation", brand: "Maybelline", category: "Beauty", mrp: 599, livePrice: 449, stock: 120, rating: 4.1, reviewCount: 6780, discount: 25, priceReason: "Standard Price", demandBadge: null, images: IMGS[10], description: "Fit Me Matte + Poreless Foundation fits your skin tone and texture for a natural, poreless look.", specs: { "Coverage": "Medium-to-full", "Finish": "Matte", "SPF": "18", "Shade Range": "40 shades", "Size": "30ml", "Type": "Liquid" } },
  { id: 11, name: "L'Oreal Vitamin C Serum", brand: "L'Oreal", category: "Beauty", mrp: 899, livePrice: 699, stock: 89, rating: 4.3, reviewCount: 2340, discount: 22, priceReason: "Standard Price", demandBadge: null, images: IMGS[11], description: "Pure Vitamin C + Hyaluronic Acid + Vitamin E. Visibly brightens skin and reduces dark spots in 4 weeks.", specs: { "Key Ingredient": "Vitamin C 12%", "Skin Type": "All skin types", "Size": "30ml", "Texture": "Lightweight serum", "Fragrance": "Fragrance-free", "SPF": "None" } },
  { id: 12, name: "Atomic Habits", brand: "James Clear", category: "Books", mrp: 799, livePrice: 399, stock: 200, rating: 4.9, reviewCount: 12560, discount: 50, priceReason: "Competitor Match", demandBadge: null, images: IMGS[12], description: "The #1 New York Times bestseller. An Easy & Proven Way to Build Good Habits & Break Bad Ones.", specs: { "Pages": "320", "Publisher": "Avery", "Language": "English", "Format": "Paperback", "ISBN": "978-0735211292", "Genre": "Self-help" } },
  { id: 13, name: "The Psychology of Money", brand: "Morgan Housel", category: "Books", mrp: 699, livePrice: 349, stock: 150, rating: 4.8, reviewCount: 8900, discount: 50, priceReason: "Competitor Match", demandBadge: null, images: IMGS[13], description: "Timeless lessons on wealth, greed, and happiness. 19 short stories exploring the strange ways people think about money.", specs: { "Pages": "256", "Publisher": "Harriman House", "Language": "English", "Format": "Paperback", "ISBN": "978-0857197689", "Genre": "Finance" } },
  { id: 14, name: "boAt Rockerz 450 Headphones", brand: "boAt", category: "Electronics", mrp: 2990, livePrice: 1799, stock: 35, rating: 4.2, reviewCount: 15230, discount: 40, priceReason: "Standard Price", demandBadge: null, images: IMGS[14], description: "Bluetooth v5.0 with 15 hours playback. 40mm dynamic drivers with boAt Signature Sound.", specs: { "Connectivity": "Bluetooth 5.0", "Battery": "15 hours", "Driver Size": "40mm", "Weight": "180g", "Charging": "Micro USB", "Warranty": "1 year" } },
  { id: 15, name: "Xiaomi Smart Band 8", brand: "Xiaomi", category: "Electronics", mrp: 3999, livePrice: 2999, stock: 42, rating: 4.4, reviewCount: 4560, discount: 25, priceReason: "Standard Price", demandBadge: null, images: IMGS[15], description: "16-day battery life. 150+ workout modes. Blood oxygen monitoring. 1.62\" AMOLED display.", specs: { "Display": "1.62\" AMOLED", "Battery": "16 days", "Water Resistance": "5ATM", "Health": "SpO2, Heart Rate, Stress", "Modes": "150+ workouts", "Weight": "27g" } },
  { id: 16, name: "Puma T-Shirt Pack of 3", brand: "Puma", category: "Fashion", mrp: 2499, livePrice: 1699, stock: 56, rating: 4.0, reviewCount: 2890, discount: 32, priceReason: "Standard Price", demandBadge: null, images: IMGS[16], description: "Essential 3-pack of classic Puma T-shirts. dryCELL technology keeps you dry and comfortable.", specs: { "Material": "100% Cotton", "Pack": "3 T-Shirts", "Fit": "Regular", "Care": "Machine wash", "Technology": "dryCELL", "Sizes": "S-3XL" } },
  { id: 17, name: "Prestige Mixer Grinder", brand: "Prestige", category: "Home & Kitchen", mrp: 3999, livePrice: 2599, stock: 12, rating: 4.3, reviewCount: 3450, discount: 35, priceReason: "Limited Stock", demandBadge: "Only 12 left", images: IMGS[17], description: "750W motor with 3 jars. Overload protector for safety. Ideal for grinding, mixing, and blending.", specs: { "Power": "750W", "Jars": "3 (1.5L, 1L, 0.4L)", "Speed": "3 speeds + pulse", "Material": "Stainless Steel", "Warranty": "5 years motor", "Safety": "Overload protector" } },
  { id: 18, name: "Boldfit Dumbbell Set 20kg", brand: "Boldfit", category: "Sports", mrp: 4999, livePrice: 3499, stock: 8, rating: 4.4, reviewCount: 1230, discount: 30, priceReason: "Limited Stock", demandBadge: "Only 8 left", images: IMGS[18], description: "Adjustable hex dumbbells. Anti-roll design. Solid cast iron with rubber coating for gym and home workouts.", specs: { "Weight": "20kg set (2x10kg)", "Material": "Cast Iron + Rubber", "Handle": "Ergonomic knurled", "Warranty": "1 year", "Roll-proof": "Yes", "Use": "Home & Gym" } },
  { id: 19, name: "Nykaa Lip Kit", brand: "Nykaa", category: "Beauty", mrp: 799, livePrice: 549, stock: 78, rating: 4.2, reviewCount: 5670, discount: 31, priceReason: "Standard Price", demandBadge: null, images: IMGS[19], description: "Nail the perfect lip look with a matching liquid lipstick + lip liner combo. 12-hour stay formula.", specs: { "Contents": "Lipstick + Liner", "Finish": "Matte", "Longevity": "12 hours", "Shade Family": "Nudes & Reds", "Cruelty-Free": "Yes", "Size": "5ml + 0.3g" } },
  { id: 20, name: "Rich Dad Poor Dad", brand: "Robert Kiyosaki", category: "Books", mrp: 599, livePrice: 299, stock: 300, rating: 4.7, reviewCount: 23450, discount: 50, priceReason: "Competitor Match", demandBadge: null, images: IMGS[20], description: "What the Rich Teach Their Kids About Money That the Poor and Middle Class Do Not! The #1 personal finance book.", specs: { "Pages": "336", "Publisher": "Plata Publishing", "Language": "English", "Format": "Paperback", "ISBN": "978-1612680194", "Genre": "Personal Finance" } },
];
