const mongoose = require('mongoose');
const { applyMongooseQueryCache } = require('../utils/mongooseQueryCache');


const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    maincategory: { type: String },
    subcategory: { type: String },
    brand: { type: String },
    color: { type: String },
    size: [{ type: String }],
    baseprice: { type: Number },
    discount: { type: Number },
    finalprice: { type: Number, required: true },
    stock: { type: String },
    description: { type: String },
    newArrival: { type: Boolean, default: false },
    isSale: { type: Boolean, default: false },
    pic1: { type: String },
    pic2: { type: String },
    pic3: { type: String },
    pic4: { type: String },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// 1. Indexing in Models
productSchema.index({ maincategory: 1, subcategory: 1, brand: 1, createdAt: -1 });
productSchema.index({ maincategory: 1, brand: 1, finalprice: 1, createdAt: -1 });
productSchema.index({ name: 'text', brand: 'text', description: 'text' }); // For text search

// Default listing sort (no filter) — without this Mongo does a full collection scan
productSchema.index({ createdAt: -1 });
// Price sorting / budget range filters
productSchema.index({ finalprice: 1, createdAt: -1 });
// Tag pages: new arrivals, sale, trending, top rated
productSchema.index({ newArrival: 1, createdAt: -1 });
productSchema.index({ isSale: 1, createdAt: -1 });
productSchema.index({ discount: -1, createdAt: -1 });
productSchema.index({ rating: -1, reviews: -1, createdAt: -1 });
// Subcategory landing pages hit this without a maincategory prefix
productSchema.index({ subcategory: 1, createdAt: -1 });

productSchema.plugin(applyMongooseQueryCache, {
    namespace: 'product',
    defaultTtlMs: 30000
});

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);