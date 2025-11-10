const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Récupérer le token du header
  const token = req.header('x-auth-token');

  // Vérifier si pas de token
  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Pas de token.' });
  }

  try {
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalide.' });
  }
};