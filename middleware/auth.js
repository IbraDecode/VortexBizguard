const jwt = require('jsonwebtoken');
const { getSessionByToken } = require('../utils/dataManager');

const JWT_SECRET = process.env.JWT_SECRET || 'vortex-bizguard-secret-key-2025';

async function authMiddleware(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    // Check if session exists and is valid
    const session = await getSessionByToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Update session last accessed
    session.lastAccessed = new Date();
    await session.save();
    
    // Set user data from session
    req.user = {
      id: session.userId._id,
      _id: session.userId._id,
      username: session.userId.username,
      email: session.userId.email,
      role: session.userId.role,
      status: session.userId.status
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    
    next();
  };
}

function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required.' });
  }
  next();
}

function requirePremium(req, res, next) {
  if (!req.user || !['premium', 'owner'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Premium access required.' });
  }
  
  next();
}

module.exports = {
  authMiddleware,
  requireRole,
  requireOwner,
  requirePremium,
  JWT_SECRET
};

