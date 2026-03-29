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

export const products: Product[] = [
  {
    id: 1, name: "Sony WH-1000XM5 Headphones", brand: "Sony", category: "Electronics",
    mrp: 29990, livePrice: 23499, stock: 8, rating: 4.7, reviewCount: 2341, discount: 22,
    priceReason: "High Demand", demandBadge: "High Demand",
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/1${i}/400/400`),
    description: "Industry-leading noise cancellation with Auto NC Optimizer. Crystal-clear hands-free calling with 4 beamforming microphones.",
    specs: { "Driver Size": "30mm", "Battery": "30 hours", "Weight": "250g", "Connectivity": "Bluetooth 5.2", "Noise Cancellation": "Active", "Charging": "USB-C" }
  },
  {
    id: 2, name: "Samsung 65\" 4K QLED TV", brand: "Samsung", category: "Electronics",
    mrp: 89990, livePrice: 74999, stock: 3, rating: 4.5, reviewCount: 876, discount: 17,
    priceReason: "Limited Stock", demandBadge: "Only 3 left",
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/2${i}/400/400`),
    description: "Quantum Dot technology delivers 100% Color Volume. Object Tracking Sound for immersive audio experience.",
    specs: { "Screen Size": "65 inches", "Resolution": "4K UHD", "HDR": "Quantum HDR", "Refresh Rate": "120Hz", "Smart TV": "Tizen OS", "Speakers": "20W" }
  },
  {
    id: 3, name: "Apple iPhone 15", brand: "Apple", category: "Electronics",
    mrp: 79900, livePrice: 71999, stock: 15, rating: 4.8, reviewCount: 5230, discount: 10,
    priceReason: "Competitor Match", demandBadge: "High Demand",
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/3${i}/400/400`),
    description: "Dynamic Island. 48MP camera with 2x Telephoto. A16 Bionic chip for exceptional performance.",
    specs: { "Display": "6.1\" Super Retina XDR", "Chip": "A16 Bionic", "Camera": "48MP Main", "Battery": "All-day", "Storage": "128GB", "5G": "Yes" }
  },
  {
    id: 4, name: "Nike Air Max 270", brand: "Nike", category: "Fashion",
    mrp: 12995, livePrice: 9499, stock: 22, rating: 4.4, reviewCount: 1890, discount: 27,
    priceReason: "Standard Price", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/4${i}/400/400`),
    description: "The Nike Air Max 270 features Nike's biggest heel Air unit yet for a super-soft ride that feels as good as it looks.",
    specs: { "Upper": "Mesh & synthetic", "Sole": "Rubber", "Air Unit": "270 degrees", "Closure": "Lace-up", "Weight": "310g", "Style": "Lifestyle" }
  },
  {
    id: 5, name: "Levi's 511 Slim Jeans", brand: "Levi's", category: "Fashion",
    mrp: 3999, livePrice: 2799, stock: 45, rating: 4.3, reviewCount: 3420, discount: 30,
    priceReason: "Standard Price", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/5${i}/400/400`),
    description: "Slim from hip to ankle, the 511 Slim Fit Jeans are a modern classic. Stretch denim for all-day comfort.",
    specs: { "Fit": "Slim", "Rise": "Mid-rise", "Material": "98% Cotton, 2% Elastane", "Wash": "Medium Indigo", "Closure": "Zip fly", "Care": "Machine washable" }
  },
  {
    id: 6, name: "Instant Pot Duo 7-in-1", brand: "Instant Pot", category: "Home & Kitchen",
    mrp: 8999, livePrice: 6499, stock: 6, rating: 4.6, reviewCount: 4567, discount: 28,
    priceReason: "Limited Stock", demandBadge: "Only 6 left",
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/6${i}/400/400`),
    description: "7-in-1 functionality: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker, and warmer.",
    specs: { "Capacity": "6 Quart", "Programs": "13 Smart Programs", "Material": "Stainless Steel", "Wattage": "1000W", "Pressure": "10.15-11.6 psi", "Safety": "10+ mechanisms" }
  },
  {
    id: 7, name: "Dyson V15 Vacuum", brand: "Dyson", category: "Home & Kitchen",
    mrp: 52900, livePrice: 44999, stock: 4, rating: 4.7, reviewCount: 892, discount: 15,
    priceReason: "Limited Stock", demandBadge: "Only 4 left",
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/7${i}/400/400`),
    description: "Laser reveals microscopic dust. Piezo sensor counts and sizes particles. HEPA filtration captures 99.99% of particles.",
    specs: { "Suction": "230 AW", "Runtime": "60 min", "Weight": "3.1kg", "Bin Volume": "0.76L", "Filtration": "HEPA", "Laser": "Green laser dust detection" }
  },
  {
    id: 8, name: "Adidas Ultraboost 22", brand: "Adidas", category: "Sports",
    mrp: 15999, livePrice: 11499, stock: 18, rating: 4.5, reviewCount: 2100, discount: 28,
    priceReason: "Competitor Match", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/8${i}/400/400`),
    description: "Responsive BOOST midsole delivers incredible energy return. Primeknit upper adapts to the shape of your foot.",
    specs: { "Upper": "Primeknit", "Midsole": "BOOST", "Outsole": "Continental Rubber", "Drop": "10mm", "Weight": "320g", "Closure": "Lace-up" }
  },
  {
    id: 9, name: "Yoga Mat Premium", brand: "Liforme", category: "Sports",
    mrp: 2499, livePrice: 1799, stock: 67, rating: 4.2, reviewCount: 890, discount: 28,
    priceReason: "Standard Price", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/9${i}/400/400`),
    description: "Eco-friendly natural rubber mat with alignment markings. Non-slip surface for all types of yoga practice.",
    specs: { "Material": "Natural Rubber", "Thickness": "6mm", "Size": "183x68cm", "Weight": "2.5kg", "Surface": "Non-slip", "Eco": "Biodegradable" }
  },
  {
    id: 10, name: "Maybelline Fit Me Foundation", brand: "Maybelline", category: "Beauty",
    mrp: 599, livePrice: 449, stock: 120, rating: 4.1, reviewCount: 6780, discount: 25,
    priceReason: "Standard Price", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/10${i}/400/400`),
    description: "Lightweight foundation with matte finish. Blurs pores and controls shine for a natural-looking finish.",
    specs: { "Type": "Liquid", "Finish": "Matte", "Coverage": "Medium", "SPF": "SPF 22", "Volume": "30ml", "Skin Type": "Normal to Oily" }
  },
  {
    id: 11, name: "L'Oreal Revitalift Serum", brand: "L'Oreal", category: "Beauty",
    mrp: 1299, livePrice: 899, stock: 34, rating: 4.3, reviewCount: 2340, discount: 31,
    priceReason: "Competitor Match", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/11${i}/400/400`),
    description: "Hyaluronic acid serum that plumps and hydrates skin. Reduces fine lines and wrinkles visibly in 2 weeks.",
    specs: { "Key Ingredient": "1.5% Hyaluronic Acid", "Volume": "30ml", "Skin Type": "All", "Usage": "AM & PM", "Fragrance": "Free", "Dermatologist": "Tested" }
  },
  {
    id: 12, name: "Atomic Habits", brand: "James Clear", category: "Books",
    mrp: 499, livePrice: 299, stock: 200, rating: 4.8, reviewCount: 12450, discount: 40,
    priceReason: "Standard Price", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/12${i}/400/400`),
    description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones. No. 1 New York Times bestseller.",
    specs: { "Pages": "320", "Language": "English", "Format": "Paperback", "Publisher": "Penguin", "ISBN": "978-0735211292", "Year": "2018" }
  },
  {
    id: 13, name: "The Psychology of Money", brand: "Morgan Housel", category: "Books",
    mrp: 399, livePrice: 249, stock: 180, rating: 4.7, reviewCount: 8900, discount: 38,
    priceReason: "Standard Price", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/13${i}/400/400`),
    description: "Timeless lessons on wealth, greed, and happiness. 19 short stories exploring the strange ways people think about money.",
    specs: { "Pages": "256", "Language": "English", "Format": "Paperback", "Publisher": "Harriman House", "ISBN": "978-0857197689", "Year": "2020" }
  },
  {
    id: 14, name: "boAt Rockerz 450", brand: "boAt", category: "Electronics",
    mrp: 2990, livePrice: 1799, stock: 55, rating: 4.1, reviewCount: 15600, discount: 40,
    priceReason: "High Demand", demandBadge: "High Demand",
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/14${i}/400/400`),
    description: "40mm dynamic drivers deliver immersive HD sound. 15 hours of playback with fast charge support.",
    specs: { "Driver Size": "40mm", "Battery": "15 hours", "Weight": "224g", "Connectivity": "Bluetooth 5.0", "Charging": "USB-C", "Mic": "Built-in" }
  },
  {
    id: 15, name: "Xiaomi Smart Band 8", brand: "Xiaomi", category: "Electronics",
    mrp: 3499, livePrice: 2299, stock: 12, rating: 4.3, reviewCount: 4560, discount: 34,
    priceReason: "High Demand", demandBadge: "High Demand",
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/15${i}/400/400`),
    description: "1.62\" AMOLED display with 60Hz refresh rate. 150+ sports modes and 16-day battery life.",
    specs: { "Display": "1.62\" AMOLED", "Battery": "16 days", "Water Resistance": "5 ATM", "Sensors": "SpO2, Heart Rate", "Weight": "27g", "Sports Modes": "150+" }
  },
  {
    id: 16, name: "Puma T-Shirt Pack of 3", brand: "Puma", category: "Fashion",
    mrp: 1799, livePrice: 1199, stock: 88, rating: 4.0, reviewCount: 2340, discount: 33,
    priceReason: "Standard Price", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/16${i}/400/400`),
    description: "Pack of 3 cotton crew-neck t-shirts. Comfortable regular fit with Puma cat logo on chest.",
    specs: { "Material": "100% Cotton", "Fit": "Regular", "Neck": "Crew neck", "Sleeve": "Short", "Pack": "3 pieces", "Care": "Machine washable" }
  },
  {
    id: 17, name: "Prestige Mixer Grinder", brand: "Prestige", category: "Home & Kitchen",
    mrp: 4999, livePrice: 3499, stock: 9, rating: 4.2, reviewCount: 3210, discount: 30,
    priceReason: "Limited Stock", demandBadge: "Only 9 left",
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/17${i}/400/400`),
    description: "750W powerful motor with 3 stainless steel jars. Superior grinding performance for all Indian recipes.",
    specs: { "Power": "750W", "Jars": "3 (Wet, Dry, Chutney)", "RPM": "20000", "Material": "Stainless Steel", "Warranty": "2 years", "Safety": "Overload protection" }
  },
  {
    id: 18, name: "Boldfit Dumbbell Set", brand: "Boldfit", category: "Sports",
    mrp: 3999, livePrice: 2699, stock: 27, rating: 4.4, reviewCount: 1560, discount: 33,
    priceReason: "Competitor Match", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/18${i}/400/400`),
    description: "Adjustable dumbbell set with PVC coating. Anti-slip grip for safe and effective home workouts.",
    specs: { "Weight": "20kg total", "Material": "Cast Iron + PVC", "Grip": "Anti-slip", "Bar Length": "35cm", "Plates": "8 pieces", "Case": "Included" }
  },
  {
    id: 19, name: "Nykaa Lip Kit", brand: "Nykaa", category: "Beauty",
    mrp: 799, livePrice: 549, stock: 76, rating: 4.2, reviewCount: 4560, discount: 31,
    priceReason: "Standard Price", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/19${i}/400/400`),
    description: "Complete lip kit with matte lipstick, lip liner, and gloss. Long-lasting formula with rich pigmentation.",
    specs: { "Contents": "Lipstick + Liner + Gloss", "Finish": "Matte & Gloss", "Duration": "12 hours", "Shades": "Berry Collection", "Cruelty Free": "Yes", "Weight": "15g total" }
  },
  {
    id: 20, name: "Rich Dad Poor Dad", brand: "Robert Kiyosaki", category: "Books",
    mrp: 350, livePrice: 199, stock: 300, rating: 4.6, reviewCount: 18900, discount: 43,
    priceReason: "Standard Price", demandBadge: null,
    images: Array.from({length:4},(_,i)=>`https://picsum.photos/seed/20${i}/400/400`),
    description: "What the Rich Teach Their Kids About Money That the Poor and Middle Class Do Not! #1 Personal Finance book.",
    specs: { "Pages": "336", "Language": "English", "Format": "Paperback", "Publisher": "Plata Publishing", "ISBN": "978-1612680194", "Year": "2017" }
  },
];

export const categories = ["All", "Electronics", "Fashion", "Home & Kitchen", "Sports", "Beauty", "Books"];
