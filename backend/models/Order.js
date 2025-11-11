const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String, required: true },
  items: [
    {
      name: String,
      quantity: Number,
      price: Number
    }
  ],
  totalPrice: Number,
  status: { type: String, default: 'En attente' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
