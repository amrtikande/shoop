const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// GET - Récupérer tous les produits (Public)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Récupérer un produit par ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Créer un nouveau produit (Admin uniquement)
router.post('/', auth, async (req, res) => {
  const product = new Product({
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
    stock: req.body.stock,
    emoji: req.body.emoji || '🎁',
    image: req.body.image,
    available: req.body.available !== undefined ? req.body.available : true
  });

  try {
    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT - Mettre à jour un produit (Admin uniquement)
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Mettre à jour les champs
    if (req.body.name !== undefined) product.name = req.body.name;
    if (req.body.description !== undefined) product.description = req.body.description;
    if (req.body.price !== undefined) product.price = req.body.price;
    if (req.body.stock !== undefined) product.stock = req.body.stock;
    if (req.body.emoji !== undefined) product.emoji = req.body.emoji;
    if (req.body.image !== undefined) product.image = req.body.image;
    if (req.body.available !== undefined) product.available = req.body.available;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE - Supprimer un produit (Admin uniquement)
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    await product.deleteOne();
    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;