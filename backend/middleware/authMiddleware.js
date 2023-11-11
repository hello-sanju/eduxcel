const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization');
    console.log('Received token:', token);

    if (!token) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    try {
      let decoded;

      if (token.startsWith('Bearer ')) {
        // Manual sign-in with JWT token
        const jwtToken = token.replace('Bearer ', '');
        decoded = jwt.verify(jwtToken, 'fRwD8ZcX#k5H*J!yN&2G@pQbS9v6E$tA');
      } else if (token.startsWith('GoogleToken ')) {
        // Google sign-in with Google token
        const googleToken = token.replace('GoogleToken ', '');
        decoded = await verifyGoogleToken(googleToken, '325528469583-a46gmh0imv5fm4d0v13emjdga3n2b2pn.apps.googleusercontent.com');
      } else {
        // Invalid token format
        return res.status(401).json({ error: 'Invalid token format' });
      }

      console.log('Decoded token:', decoded);

      // Add the user object to the request
      const user = await User.findById(decoded.userId);
      req.user = user;

      next(); // Continue with the next middleware or route
    } catch (verifyError) {
      console.error('Token Verification Error:', verifyError);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = authMiddleware;
