const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// POST - Ajouter une commande
router.post('/', async (req, res) => {
  try {
    const { clientName, phone, email, address, items } = req.body;

    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = new Order({
      clientName,
      phone,
      email,
      address,
      items,
      totalPrice
    });

    await order.save();

    res.status(201).json({ message: 'Commande enregistrée avec succès', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Voir toutes les commandes (pour l’admin)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
