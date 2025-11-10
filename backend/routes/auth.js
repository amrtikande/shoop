const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST - Login Admin
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;

    // Vérifier le mot de passe
    if (password === process.env.ADMIN_PASSWORD) {
      // Créer un token JWT
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

// POST - Vérifier le token
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