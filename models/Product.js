const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    finalprice: { type: Number, required: true },
    pic1: { type: String },
    brand: { type: String },
    color: { type: String },
    size: { type: String },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);