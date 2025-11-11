const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: 'API E-commerce fonctionnelle ✅',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// Route ping pour keep-alive
app.get('/api/ping', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const Product = require('./models/Product');
    const count = await Product.countDocuments();
    
    res.json({ 
      status: 'ok',
      database: dbStatus,
      productsCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      message: err.message 
    });
  }
});

// Keep-alive automatique - ping toutes les 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    const Product = require('./models/Product');
    await Product.findOne();
    console.log('✅ Keep-alive ping -', new Date().toLocaleString());
  } catch (err) {
    console.error('❌ Erreur keep-alive:', err.message);
  }
});

// Vérification de santé toutes les 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB actif -', new Date().toLocaleString());
    } else {
      console.log('⚠️  MongoDB déconnecté, reconnexion...');
      await mongoose.connect(process.env.MONGODB_URI);
    }
  } catch (err) {
    console.error('❌ Erreur connexion MongoDB:', err.message);
  }
});

// Connexion MongoDB avec reconnexion auto
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
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

// Gérer les déconnexions
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB déconnecté, tentative de reconnexion...');
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Erreur MongoDB:', err);
});

// Connexion initiale
connectDB();

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📊 Keep-alive activé (ping toutes les 10 minutes)`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 Serveur arrêté proprement');
  process.exit(0);
});
