// Run this script ONCE to seed sample data for all main collections.
// Usage: node seed.js

const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
const Cart = require('./models/Cart');
const Wishlist = require('./models/Wishlist');
const Newslatter = require('./models/Newslatter');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eshopper';

async function seed() {
  await mongoose.connect(MONGO_URI);

  // Sample User
  const user = await User.create({
    email: 'testuser@example.com',
    password: '$2a$10$testpasswordhash', // Use a real bcrypt hash in production
    name: 'Test User',
    phone: '9999999999',
  });

  // Sample Product
  const product = await Product.create({
    name: 'Sample T-Shirt',
    maincategory: 'Fashion',
    subcategory: 'T-Shirts',
    brand: 'BrandX',
    color: 'Blue',
    size: 'L',
    baseprice: 999,
    discount: 20,
    finalprice: 799,
    stock: 'In Stock',
    description: 'Premium quality cotton T-shirt',
    pic1: 'https://dummyimage.com/300x300/007bff/fff&text=Sample+T-Shirt',
    rating: 4.7,
    reviews: 12
  });

  // Sample Cart
  await Cart.create({
    user: user._id,
    items: [{ product: product._id, quantity: 2 }]
  });

  // Sample Wishlist
  await Wishlist.create({
    user: user._id,
    products: [product._id]
  });

  // Sample Newsletter
  await Newslatter.create({
    email: 'subscriber@example.com'
  });

  console.log('✅ Sample data seeded!');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
