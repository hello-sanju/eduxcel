const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose'); 
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    console.log('Received token:', token);

    // Verify the token using the correct secret
    const decoded = jwt.verify(token, 'fRwD8ZcX#k5H*J!yN&2G@pQbS9v6E$tA'); // Replace with your secret key
    console.log('Decoded token:', decoded);

    // Find the user by their ID and add it to the request
    let user;

    if (mongoose.Types.ObjectId.isValid(decoded.userId)) {
      // If userId is a valid ObjectId, convert it to a string
      user = await User.findById(decoded.userId.toString());
    } else {
      // If userId is not a valid ObjectId, use it as is
      user = await User.findById(decoded.userId);
    }

    if (!user) {
      console.error('User not found');
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next(); // Continue with the next middleware or route
  } catch (error) {
    console.error('Authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      // Handle JWT verification errors specifically
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = authMiddleware;
