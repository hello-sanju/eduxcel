const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  username: { type: String, required: true },
  firstName: String,
  lastName: String,
  bio: String,
  profileImage: String,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  lastSignInAt: { type: Date, default: null },
  ipAddress: String,
});

// Create a geospatial index on the location field
userProfileSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('UserProfile', userProfileSchema);
