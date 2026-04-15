const mongoose = require('mongoose');


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
    pic1: { type: String },
    pic2: { type: String },
    pic3: { type: String },
    pic4: { type: String },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);