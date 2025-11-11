// ============================================
// BACKEND E-COMMERCE - Node.js + Express + MongoDB
// Optimisé pour Render avec keep-alive
// ============================================
console.log('🔍 Variables d\'environnement :');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Défini' : '❌ Manquant');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Défini' : '❌ Manquant');
console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '✅ Défini' : '❌ Manquant');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const orderRoutes = require('./routes/orders');
app.use('/api/orders', orderRoutes);

// ----------------------
// Middleware
// ----------------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----------------------
// Routes
// ----------------------
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));

// Health check
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
// Connexion MongoDB
// ----------------------
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ Erreur : MONGODB_URI est vide. Vérifie ton fichier .env !');
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connecté à MongoDB');
  } catch (err) {
    console.error('❌ Erreur MongoDB:', err.message);
    setTimeout(connectDB, 5000);
  }
};

// Gestion des déconnexions
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
// Keep-alive automatique
// ----------------------

// Ping MongoDB toutes les 10 minutes
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
  const https = require('https');
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




