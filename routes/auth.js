const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
  getUserByEmail, 
  getUserByUsername, 
  createUser, 
  addActivity,
  createSession,
  deleteSession,
  getSessionByToken
} = require('../utils/dataManager');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, telegramId } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUserByEmail = await getUserByEmail(email);
    const existingUserByUsername = await getUserByUsername(username);
    
    if (existingUserByEmail || existingUserByUsername) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    const userData = {
      username,
      email,
      password, // Will be hashed by the User model pre-save hook
      telegramId: telegramId || null,
      role: 'user',
      status: 'active'
    };
    
    const user = await createUser(userData);
    
    // Log activity
    await addActivity({
      userId: user._id,
      action: 'register',
      description: `User ${username} registered`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await createSession({
      userId: user._id,
      token,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user by username or email
    let user = await getUserByUsername(username);
    if (!user) {
      user = await getUserByEmail(username);
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }
    
    // Check password
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Log activity
    await addActivity({
      userId: user._id,
      action: 'login',
      description: `User ${user.username} logged in`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await createSession({
      userId: user._id,
      token,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      // Delete session
      await deleteSession(token);
      
      // Decode token to get user info for logging
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        await addActivity({
          userId: decoded.userId,
          action: 'logout',
          description: `User ${decoded.username} logged out`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (err) {
        // Token might be expired, but we still want to log the logout attempt
        console.log('Token verification failed during logout:', err.message);
      }
    }
    
    res.json({ message: 'Logout successful' });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
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
    
    res.json({
      valid: true,
      user: {
        id: session.userId._id,
        username: session.userId.username,
        email: session.userId.email,
        role: session.userId.role,
        status: session.userId.status
      }
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;

