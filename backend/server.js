// ============================================
// BACKEND E-COMMERCE - Node.js + Express + MongoDB
// Optimisé pour Render avec keep-alive
// ============================================
const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // ton modèle Order

// Création d'une commande
router.post('/', async (req, res) => {
  try {
    const { clientName, phone, address, products } = req.body;
    if (!clientName || !phone || !address) {
      return res.status(400).json({ message: 'Tous les champs clientName, phone et address sont requis.' });
    }
    const newOrder = new Order({ clientName, phone, address, products });
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Récupérer toutes les commandes
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const https = require('https');

const app = express();

// ----------------------
// Middleware
// ----------------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----------------------
// Vérification variables d'environnement
// ----------------------
console.log('🔍 Variables d\'environnement :');
console.log('PORT:', process.env.PORT || 3000);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Défini' : '❌ Manquant');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Défini' : '❌ Manquant');
console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '✅ Défini' : '❌ Manquant');

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI manquant !');
  process.exit(1);
}

// ----------------------
// Connexion MongoDB
// ----------------------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connecté à MongoDB');
  } catch (err) {
    console.error('❌ Erreur MongoDB:', err.message);
    setTimeout(connectDB, 5000); // retry
  }
};

// Gestion des événements de MongoDB
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB déconnecté, tentative de reconnexion...');
  setTimeout(connectDB, 5000);
});
mongoose.connection.on('error', (err) => {
  console.error('❌ Erreur MongoDB:', err);
});

// Connexion initiale
connectDB();

// ----------------------
// Import des routes
// ----------------------
app.use('/api/products', require('./routes/products')); // ./routes/products.js
app.use('/api/orders', require('./routes/orders'));     // ./routes/orders.js
app.use('/api/auth', require('./routes/auth'));         // ./routes/auth.js

// ----------------------
// Health check
// ----------------------
app.get('/', (req, res) => {
  res.json({
    message: 'API E-commerce fonctionnelle ✅',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
});

// Ping pour keep-alive
app.get('/api/ping', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const Product = require('./models/Product');
    const count = await Product.countDocuments();
    res.json({ status: 'ok', database: dbStatus, productsCount: count, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ----------------------
// Keep-alive automatique
// ----------------------
cron.schedule('*/10 * * * *', async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const Product = require('./models/Product');
      await Product.findOne();
      console.log('✅ Keep-alive ping envoyé à MongoDB -', new Date().toLocaleString());
    } else {
      console.log('⚠️ MongoDB déconnecté, reconnexion...');
      await connectDB();
    }
  } catch (err) {
    console.error('❌ Erreur keep-alive:', err.message);
  }
});

// Auto-ping du serveur si SELF_PING_URL défini
if (process.env.SELF_PING_URL) {
  cron.schedule('*/14 * * * *', () => {
    https.get(process.env.SELF_PING_URL, () => {
      console.log('✅ Auto-ping serveur effectué -', new Date().toLocaleString());
    }).on('error', (err) => {
      console.error('❌ Erreur auto-ping:', err.message);
    });
  });
}

// ----------------------
// Démarrage serveur
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log('📊 Keep-alive activé (ping toutes les 10 minutes)');
});

// ----------------------
// Graceful shutdown
// ----------------------
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 Serveur arrêté proprement');
  process.exit(0);
});

