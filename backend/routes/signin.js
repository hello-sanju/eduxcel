const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const nodemailer = require('nodemailer');
const moment = require('moment-timezone'); 

require('dotenv').config();

// Function to send a welcome email
const sendWelcomeEmail = async (email, userName, latitude, longitude, lastSignInAt) => {
  const transporter = nodemailer.createTransport({    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mapImageUrl = `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`;

  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: email,
    subject: 'Embrace Eduxcel: Welcome to the Community!',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to YourApp</title>
          <style>
              /* General styles for the email */
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 0;
              }

              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #ffffff;
                  border-radius: 10px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }

              h1 {
                  font-size: 32px;
                  color: #333;
                  margin-bottom: 20px;
              }

              p {
                  font-size: 18px;
                  color: #555;
                  margin-bottom: 16px;
              }

              ul {
                  margin: 16px 0;
                  padding-left: 20px;
              }

              li {
                  font-size: 18px;
                  color: #555;
                  margin-bottom: 10px;
              }

              .button {
                  display: inline-block;
                  padding: 12px 24px;
                  background-color: #007BFF;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 5px;
              }

              .button:hover {
                  background-color: #0056b3;
              }

              .signature {
                  font-size: 24px;
                  font-weight: bold;
                  margin-top: 20px;
              }

              /* Style for the header image */
              .header-image {
                  width: 100%;
                  max-height: 200px;
                  object-fit: cover;
                  border-top-left-radius: 10px;
                  border-top-right-radius: 10px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <img class="header-image" src="https://sanjaybasket.s3.ap-south-1.amazonaws.com/logo.png" alt="Welcome to Eduxcel">
              <h1>Welcome to Eduxcel</h1>
              <p>Dear ${userName},</p>
              <p>Welcome back to <strong>Eduxcel</strong>! We're thrilled to have you on board.</p>
              <p>Here's what you can do now:</p>
              <ul>
                  <li>Explore our latest features and updates.</li>
                  <li>Connect with other users and start engaging with our community.</li>
                  <li>Discover exciting content tailored just for you.</li>
                  <li>Stay updated with personalized notifications.</li>
              </ul>
              <p>If you have any questions, need assistance, or want to share feedback, don't hesitate to reach out to us.</p>
              <p>Thank you for choosing <strong>Eduxcel</strong> for your online journey. We're here to make it awesome!</p>
<p>User's Location:</p>
<div id="map" style="height: 200px; width: 100%;">
  <img src="${mapImageUrl}" alt="User Location" style="width: 100%; height: 100%;">
  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
    <strong>Latitude:</strong> ${latitude}<br />
    <strong>Longitude:</strong> ${longitude}
  </div>
</div>  
      <p>Last Sign-In: ${lastSignInAt}</p>
              <a href="https://eduxcel.vercel.app" class="button">Start Exploring</a>
              <p class="signature">Best regards,</p>
              <p>Eduxcel Team</p>
          </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

router.post('/', async (req, res) => {
  const { email, password, latitude, longitude } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed: User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Authentication failed: Invalid password' });
    }

    // Log the user's location (latitude and longitude)
    console.log(`User Location: Latitude ${latitude}, Longitude ${longitude}`);

        // Get the current time in IST
    const currentTimeIST = moment().tz('Asia/Kolkata').format();

    // Update user's profile with the new location and timestamp if coordinates are provided and valid
    if (!isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
      await UserProfile.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            location: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            lastSignInAt: currentTimeIST, // Updated to use Indian Standard Time
            ipAddress: req.userIpAddress,
          },
        },
        { new: true, upsert: true }
      );
    }

    // Sign a token as before
    const token = jwt.sign({ userId: user._id }, 'fRwD8ZcX#k5H*J!yN&2G@pQbS9v6E$tA');
    // Send a welcome email to the user
    await sendWelcomeEmail(email, user.username, latitude, longitude, currentTimeIST);

    res.status(200).json({ token });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ message: 'Error signing in: Internal Server Error' });
  }
});

module.exports = router;
