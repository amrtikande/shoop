const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// GET - Récupérer toutes les commandes (Admin uniquement)
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Récupérer une commande par ID (Admin uniquement)
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Créer une nouvelle commande (Public)
router.post('/', async (req, res) => {
  try {
    // Vérifier le stock avant de créer la commande
    for (const item of req.body.items) {
      const product = await Product.findById(item.id || item.productId);
      if (!product) {
        return res.status(404).json({ 
          message: `Produit ${item.name} non trouvé` 
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Stock insuffisant pour ${item.name}. Disponible: ${product.stock}` 
        });
      }
    }

    // Créer la commande
    const order = new Order({
      customer: req.body.customer,
      items: req.body.items.map(item => ({
        productId: item.id || item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        emoji: item.emoji,
        image: item.image
      })),
      total: req.body.total,
      paymentMethod: 'cash_on_delivery'
    });

    const newOrder = await order.save();

    // Mettre à jour le stock des produits
    for (const item of req.body.items) {
      const product = await Product.findById(item.id || item.productId);
      if (product) {
        product.stock -= item.quantity;
        if (product.stock <= 0) {
          product.available = false;
          product.stock = 0;
        }
        await product.save();
      }
    }

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT - Mettre à jour le statut d'une commande (Admin uniquement)
router.put('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    if (req.body.status) {
      order.status = req.body.status;
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE - Supprimer une commande (Admin uniquement)
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    await order.deleteOne();
    res.json({ message: 'Commande supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
