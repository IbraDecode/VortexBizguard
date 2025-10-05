const mongoose = require('mongoose');
const User = require('../models/User');
const Bug = require('../models/Bug');
const Sender = require('../models/Sender');
const Session = require('../models/Session');
const Activity = require('../models/Activity');
const Settings = require('../models/Settings');

// Default settings
const defaultSettings = {
  siteName: 'Vortex Bizguard',
  cooldownTime: 300000, // 5 minutes
  maxBugPerDay: 50,
  allowRegistration: false
};

async function initializeData() {
  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ibradecode:bacotbacot@vortex-bizguard.7c2jebn.mongodb.net/?retryWrites=true&w=majority&appName=vortex-bizguard');
      console.log('✅ Connected to MongoDB');
    }
    
    // Initialize default settings
    for (const [key, value] of Object.entries(defaultSettings)) {
      const existingSetting = await Settings.findOne({ key });
      if (!existingSetting) {
        await Settings.create({
          key,
          value,
          description: `Default ${key} setting`
        });
      }
    }
    
    // Create default admin user if no users exist
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const adminUser = new User({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@vortexbizguard.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'owner',
        status: 'active'
      });
      
      await adminUser.save();
      console.log('✅ Default admin user created');
    }
    
    console.log('✅ Data initialized');
  } catch (error) {
    console.error('Error initializing data:', error);
    throw error;
  }
}

// User management
async function getUsers() {
  try {
    return await User.find({}).select('-password');
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

async function getUserById(id) {
  try {
    return await User.findById(id).select('-password');
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

async function getUserByUsername(username) {
  try {
    return await User.findOne({ username });
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
}

async function getUserByEmail(email) {
  try {
    return await User.findOne({ email });
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

async function createUser(userData) {
  try {
    const user = new User(userData);
    await user.save();
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function updateUser(id, updateData) {
  try {
    return await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function deleteUser(id) {
  try {
    return await User.findByIdAndDelete(id);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// Bug management
async function getBugs(userId = null) {
  try {
    const query = userId ? { createdBy: userId } : {};
    return await Bug.find(query).populate('createdBy', 'username email');
  } catch (error) {
    console.error('Error getting bugs:', error);
    return [];
  }
}

async function getBugById(id) {
  try {
    return await Bug.findById(id).populate('createdBy', 'username email');
  } catch (error) {
    console.error('Error getting bug by ID:', error);
    return null;
  }
}

async function createBug(bugData) {
  try {
    const bug = new Bug(bugData);
    await bug.save();
    return await Bug.findById(bug._id).populate('createdBy', 'username email');
  } catch (error) {
    console.error('Error creating bug:', error);
    throw error;
  }
}

async function updateBug(id, updateData) {
  try {
    return await Bug.findByIdAndUpdate(id, updateData, { new: true }).populate('createdBy', 'username email');
  } catch (error) {
    console.error('Error updating bug:', error);
    throw error;
  }
}

async function deleteBug(id) {
  try {
    return await Bug.findByIdAndDelete(id);
  } catch (error) {
    console.error('Error deleting bug:', error);
    throw error;
  }
}

// Sender management
async function getSenders(userId = null) {
  try {
    const query = userId ? { createdBy: userId } : {};
    return await Sender.find(query).populate('createdBy', 'username email');
  } catch (error) {
    console.error('Error getting senders:', error);
    return [];
  }
}

async function getSenderById(id) {
  try {
    return await Sender.findById(id).populate('createdBy', 'username email');
  } catch (error) {
    console.error('Error getting sender by ID:', error);
    return null;
  }
}

async function createSender(senderData) {
  try {
    const sender = new Sender(senderData);
    await sender.save();
    return await Sender.findById(sender._id).populate('createdBy', 'username email');
  } catch (error) {
    console.error('Error creating sender:', error);
    throw error;
  }
}

async function updateSender(id, updateData) {
  try {
    return await Sender.findByIdAndUpdate(id, updateData, { new: true }).populate('createdBy', 'username email');
  } catch (error) {
    console.error('Error updating sender:', error);
    throw error;
  }
}

async function deleteSender(id) {
  try {
    return await Sender.findByIdAndDelete(id);
  } catch (error) {
    console.error('Error deleting sender:', error);
    throw error;
  }
}

// Session management
async function createSession(sessionData) {
  try {
    const session = new Session(sessionData);
    await session.save();
    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

async function getSessionByToken(token) {
  try {
    return await Session.findOne({ token, expiresAt: { $gt: new Date() } }).populate('userId', 'username email role status');
  } catch (error) {
    console.error('Error getting session by token:', error);
    return null;
  }
}

async function deleteSession(token) {
  try {
    return await Session.findOneAndDelete({ token });
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

async function cleanupExpiredSessions() {
  try {
    return await Session.deleteMany({ expiresAt: { $lt: new Date() } });
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    throw error;
  }
}

// Activity management
async function addActivity(activityData) {
  try {
    const activity = new Activity({
      ...activityData,
      createdAt: new Date()
    });
    await activity.save();
    
    // Keep only last 1000 activities per user
    const activities = await Activity.find({ userId: activityData.userId })
      .sort({ createdAt: -1 })
      .skip(1000);
    
    if (activities.length > 0) {
      const idsToDelete = activities.map(a => a._id);
      await Activity.deleteMany({ _id: { $in: idsToDelete } });
    }
    
    return activity;
  } catch (error) {
    console.error('Error adding activity:', error);
    throw error;
  }
}

async function getActivities(userId = null, limit = 100) {
  try {
    const query = userId ? { userId } : {};
    return await Activity.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    console.error('Error getting activities:', error);
    return [];
  }
}

// Settings management
async function getSetting(key) {
  try {
    const setting = await Settings.findOne({ key });
    return setting ? setting.value : null;
  } catch (error) {
    console.error('Error getting setting:', error);
    return null;
  }
}

async function setSetting(key, value, updatedBy = null) {
  try {
    return await Settings.findOneAndUpdate(
      { key },
      { 
        value, 
        updatedBy, 
        updatedAt: new Date() 
      },
      { 
        upsert: true, 
        new: true 
      }
    );
  } catch (error) {
    console.error('Error setting setting:', error);
    throw error;
  }
}

async function getAllSettings() {
  try {
    const settings = await Settings.find({});
    const result = {};
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result;
  } catch (error) {
    console.error('Error getting all settings:', error);
    return defaultSettings;
  }
}

// Statistics
async function getStats() {
  try {
    const [userCount, bugCount, senderCount, activityCount] = await Promise.all([
      User.countDocuments(),
      Bug.countDocuments(),
      Sender.countDocuments(),
      Activity.countDocuments()
    ]);
    
    return {
      users: userCount,
      bugs: bugCount,
      senders: senderCount,
      activities: activityCount
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      users: 0,
      bugs: 0,
      senders: 0,
      activities: 0
    };
  }
}

module.exports = {
  initializeData,
  
  // User methods
  getUsers,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  
  // Bug methods
  getBugs,
  getBugById,
  createBug,
  updateBug,
  deleteBug,
  
  // Sender methods
  getSenders,
  getSenderById,
  createSender,
  updateSender,
  deleteSender,
  
  // Session methods
  createSession,
  getSessionByToken,
  deleteSession,
  cleanupExpiredSessions,
  
  // Activity methods
  addActivity,
  getActivities,
  
  // Settings methods
  getSetting,
  setSetting,
  getAllSettings,
  
  // Stats
  getStats
};

