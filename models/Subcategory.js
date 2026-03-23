const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    maincategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Maincategory' },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema);