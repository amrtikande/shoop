// ============================================
// BACKEND E-COMMERCE - Node.js + Express + MongoDB
// AVEC KEEP-ALIVE AUTOMATIQUE
// ============================================

// 1. INSTALLATION DES DÉPENDANCES
// Exécutez ces commandes dans votre terminal :
/*
npm init -y
npm install express mongoose cors dotenv bcryptjs jsonwebtoken node-cron
npm install --save-dev nodemon
*/

// ============================================
// SERVER.JS - Fichier principal avec Keep-Alive
// ============================================

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

// Route de test / Health check
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
    // Vérifier la connexion à MongoDB
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Faire une requête simple pour maintenir la connexion active
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

// ============================================
// KEEP-ALIVE AUTOMATIQUE
// ============================================

// Option 1 : Ping MongoDB toutes les 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    const Product = require('./models/Product');
    await Product.findOne(); // Requête simple pour garder la connexion active
    console.log('✅ Keep-alive ping envoyé à MongoDB -', new Date().toLocaleString());
  } catch (err) {
    console.error('❌ Erreur keep-alive:', err.message);
  }
});

// Option 2 : Vérification de santé toutes les 5 minutes
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

// Option 3 : Auto-ping du serveur (si déployé)
if (process.env.SELF_PING_URL) {
  cron.schedule('*/14 * * * *', async () => {
    try {
      const https = require('https');
      https.get(process.env.SELF_PING_URL, (res) => {
        console.log('✅ Auto-ping effectué -', new Date().toLocaleString());
      });
    } catch (err) {
      console.error('❌ Erreur auto-ping:', err.message);
    }
  });
}

// ============================================
// CONNEXION MONGODB avec reconnexion auto
// ============================================

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
    // Réessayer la connexion après 5 secondes
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


// ============================================
// MODELS/Product.js - Modèle Produit
// ============================================
/*
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  emoji: {
    type: String,
    default: '🎁'
  },
  image: {
    type: String,
    default: null
  },
  available: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
*/

// ============================================
// MODELS/Order.js - Modèle Commande
// ============================================
/*
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    price: Number,
    quantity: Number,
    emoji: String,
    image: String
  }],
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'cash_on_delivery'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
*/

// ============================================
// ROUTES/products.js - Routes Produits
// ============================================
/*
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    if (req.body.name) product.name = req.body.name;
    if (req.body.description !== undefined) product.description = req.body.description;
    if (req.body.price) product.price = req.body.price;
    if (req.body.stock !== undefined) product.stock = req.body.stock;
    if (req.body.emoji) product.emoji = req.body.emoji;
    if (req.body.image !== undefined) product.image = req.body.image;
    if (req.body.available !== undefined) product.available = req.body.available;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

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
*/

// ============================================
// ROUTES/orders.js - Routes Commandes
// ============================================
/*
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

router.post('/', async (req, res) => {
  try {
    for (const item of req.body.items) {
      const product = await Product.findById(item.id || item.productId);
      if (!product) {
        return res.status(404).json({ 
          message: `Produit ${item.name} non trouvé` 
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Stock insuffisant pour ${item.name}` 
        });
      }
    }

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

    for (const item of req.body.items) {
      await Product.findByIdAndUpdate(
        item.id || item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    if (req.body.status) order.status = req.body.status;

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
*/

// ============================================
// ROUTES/auth.js - Routes Authentification
// ============================================
/*
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { admin: true },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        token,
        message: 'Connexion réussie'
      });
    } else {
      res.status(401).json({ message: 'Mot de passe incorrect' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ valid: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, admin: decoded.admin });
  } catch (err) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
*/

// ============================================
// MIDDLEWARE/auth.js - Middleware d'authentification
// ============================================
/*
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Pas de token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalide.' });
  }
};
*/

// ============================================
// RÉSUMÉ DES SOLUTIONS
// ============================================
/*



