const express = require('express');
const cors = require('cors');
const router = express.Router();
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const signupRouter = require('./routes/signup');
const signinRouter = require('./routes/signin');
const authMiddleware = require('./middleware/authMiddleware');
const profileRouter = require('./routes/profile');
const coursesRouter = require('./routes/courses');
const forgotPasswordRouter = require('./routes/forgotPassword');
const resetPasswordRouter = require('./routes/resetPassword');
const User = require('./models/User'); // Import the User model
const UserProfile = require('./models/UserProfile'); // Import the UserProfile model
const jwt = require('jsonwebtoken'); // Import the jsonwebtoken package
const { verifyGoogleToken } = require('./middleware/authMiddleware');

dotenv.config();
const app = express();

// Configure sessions before Passport middleware
app.use(
  session({
    secret: 'fRwD8ZcX#k5H*J!yN&2G@pQbS9v6E$tA',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB using the MONGODB_URI_MYDB environment variable
mongoose.connect(process.env.MONGODB_URI_MYDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

// Define your MongoDB collections (models)
const Course = require('./models/Course');
const Feedback = mongoose.model('feedback', {
  name: String,
  email: String,
  feedback: String,
});
const Query = mongoose.model('query', { name: String, email: String, query: String });
const Tools = mongoose.model('tools', {
  title: String,
  overview: [String],
  description: [String],
  keypoints: [String],
  imageURL: [String],
  videoURL: [String],
});

const Working = mongoose.model('working', {
  title: String,
  overview: [String],
  description: [String],
  keypoints: [String],
  imageURL: [String],
  videoURL: [String],
});
const Courses = mongoose.model('courses', {
  title: String,
  description: String,
  content: [{
    title: String,
    description: String,
    videoURL: String,
    imageURL: String,
    // Add other properties as needed
  }]
});



// Define Passport strategies
passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).exec((err, user) => {
    done(err, user);
  });
});



// Google OAuth2 routes
passport.use(
  new GoogleStrategy(
    {
      clientID: '325528469583-a46gmh0imv5fm4d0v13emjdga3n2b2pn.apps.googleusercontent.com',
      clientSecret: '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',
      callbackURL: 'https://eduxcel-backend.onrender.com/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
          // Update the user's email and username if they have changed on Google
          if (existingUser.email !== profile.emails[0].value) {
            existingUser.email = profile.emails[0].value;
          }
          if (existingUser.username !== profile.displayName) {
            existingUser.username = profile.displayName;
          }

          await existingUser.save();

          // Find or create the user profile
          let userProfile = await UserProfile.findOne({ user: existingUser._id });

          if (!userProfile) {
            userProfile = new UserProfile({
              user: existingUser._id,
              email: profile.emails[0].value,
              username: profile.displayName,
              // Add other profile properties as needed
            });
          }

          await userProfile.save();

          return done(null, existingUser);
        }

        const newUser = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          username: profile.displayName,
          // Add other user properties as needed
        });

        await newUser.save();

        const newProfile = new UserProfile({
          user: newUser._id,
          email: profile.emails[0].value,
          username: profile.displayName,
          // Add other profile properties as needed
        });

        await newProfile.save();

        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    }
  )
);


const allowedOrigins = [
  'https://eduxcel.vercel.app',
  'http://localhost:5173',
  // Add more domains if needed
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use((req, res, next) => {
  const ipAddress = req.ip; // Get the user's IP address
  req.userIpAddress = ipAddress; // Store the IP address in the request object
  next();
});


app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use(express.static(path.join(__dirname, 'client/build')));

// Define your routes and APIs here
app.use('/api/signup', signupRouter);
app.use('/api/profile', authMiddleware);
app.use('/api/signin', signinRouter);

app.use('/api/profile', profileRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/forgotpassword', forgotPasswordRouter);
app.use('/api/reset-password', resetPasswordRouter);

app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    console.log('Received a request to update user profile');

    // Get the user ID from the authenticated user
    const userId = req.user._id;

    // Fetch the user profile based on the user ID
    let userProfile = await UserProfile.findOne({ user: userId });

    if (!userProfile) {
      console.log('User profile not found');
      return res.status(404).json({ message: 'User profile not found' });
    }
// Convert lastSignInAt to IST before sending it in the response
    userProfile.lastSignInAt = moment(userProfile.lastSignInAt).tz('Asia/Kolkata');


    // Update the user profile fields with the request body data
    userProfile = Object.assign(userProfile, req.body);

    // Save the updated user profile
    await userProfile.save();

    // Send the updated user profile as the response
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Error updating user profile' });
  }
});
// Serve profile images with caching disabled
app.get('/uploads/:filename', (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); // Disable caching
  res.sendFile(path.join(__dirname, 'uploads', req.params.filename));
});
app.get('/api/feedbacks', async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({ error: 'Error fetching feedbacks' });
  }
});

app.get('/api/queries', async (req, res) => {
  try {
    const queries = await Query.find();
    res.json(queries);
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ error: 'Error fetching queries' });
  }
});
app.get('/api/blogs/:title', async (req, res) => {
  try {
    const blogTitle = req.params.title;

    // Fetch blog content based on the provided title
    const toolsBlog = await Tools.findOne({ title: blogTitle });
    const workingBlog = await Working.findOne({ title: blogTitle });

    if (toolsBlog) {
      return res.json(toolsBlog);
    } else if (workingBlog) {
      return res.json(workingBlog);
    } else {
      return res.status(404).json({ error: 'Blog not found' });
    }
  } catch (error) {
    console.error('Error fetching blog content:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/api/:collection', async (req, res) => {
  const collection = req.params.collection;
  try {
    let data;
    switch (collection) {
     
      case 'tools':
        data = await Tools.find().lean();
        break;
      case 'working':
        data = await Working.find().lean();
        break;
      default:
        return res.status(404).json({ error: 'Collection not found' });
    }
    console.log('Data fetched successfully from', collection, 'collection:', data);
    res.json(data);
  } catch (error) {
    console.error(`Error fetching data from ${collection} collection:`, error);
    res.status(500).json({ error: `Error fetching data from ${collection} collection` });
  }
});

app.get('/api/blogs/:collection/:title', async (req, res) => {
  try {
    const { collection, title } = req.params;
    const decodedTitle = decodeURIComponent(title);

    // Fetch blog content based on the provided title and collection
    const blog = await (collection === 'tools' ? Tools : Working).findOne({ title: decodedTitle });

    if (blog) {
      return res.json(blog);
    } else {
      return res.status(404).json({ error: 'Blog not found' });
    }
  } catch (error) {
    console.error('Error fetching blog content:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Fetch details of a specific course by title
app.get('/api/courses/:title', async (req, res) => {
  try {
    const courseTitle = req.params.title;
    const course = await Courses.findOne({ title: courseTitle });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fetch content of a specific course by title and collection
app.get('/api/courses/:collection/:title', async (req, res) => {
  try {
    const { collection, title } = req.params;
    const decodedTitle = decodeURIComponent(title);

    // Dynamically select the model based on the collection parameter
    let CourseModel;

    try {
      CourseModel = mongoose.model(collection);
    } catch (error) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Fetch content based on the provided title and collection
    const content = await CourseModel.findOne({ title: decodedTitle });

    if (content) {
      const selectedContent = content.content.find(item => item.title === decodedTitle);
      return res.json(selectedContent);
    } else {
      return res.status(404).json({ error: 'Content not found' });
    }
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/api/submit-feedback', async (req, res) => {
  try {
    const { name, email, feedback } = req.body;
    const newFeedback = new Feedback({ name, email, feedback });
    await newFeedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error submitting feedback' });
  }
});

app.post('/api/submit-query', async (req, res) => {
  try {
    const { name, email, query } = req.body;
    const newQuery = new Query({ name, email, query });
    await newQuery.save();
    res.status(201).json({ message: 'Query submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error submitting query' });
  }
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error logging out:', err);
      return res.status(500).json({ error: 'Error logging out' });
    }
    req.session.destroy();
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

app.get('/api/protected', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'This route is protected' });
});

app.get('/api/courses/:title/:module', async (req, res) => {
  try {
    const courseTitle = req.params.title;
    const moduleTitle = req.params.module;
    const course = await Course.findOne({ title: courseTitle });

    if (!course) {
      console.log('Course not found:', courseTitle);
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!course.modules || !Array.isArray(course.modules)) {
      console.log('Modules not found or not an array:', courseTitle);
      return res.status(404).json({ error: 'Modules not found' });
    }

    const module = course.modules.find(
      (module) => module.title === moduleTitle
    );

    if (!module) {
      console.log('Module not found:', moduleTitle);
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json(module);
  } catch (error) {
    console.error('Error fetching module details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Google OAuth2 routes
app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
app.get('/', (req, res) => {
  res.send('Welcome to My API');
});
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/signin' }),
  async (req, res) => {
    try {
      // Check if the user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication failed' });
      }

      // Get the authenticated user
      const user = req.user;

      // Find or create the user profile
      let userProfile = await UserProfile.findOne({ user: user._id });

      if (!userProfile) {
        userProfile = new UserProfile({
          user: user._id,
          email: user.email,
          username: user.username,
          // Add other profile properties as needed
        });

        await userProfile.save();
      }

      // Generate a JWT token for the user
      const token = jwt.sign({ userId: user._id }, 'fRwD8ZcX#k5H*J!yN&2G@pQbS9v6E$tA', {
        expiresIn: '1h',
      });

      // Redirect to the frontend with the token in the URL
      res.redirect(`https://eduxcel.vercel.app/profile?token=${token}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);
// Serve the React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});


// Listen for MongoDB collection events
mongoose.connection.on('collection', (collectionName) => {
  console.log(`Collection ${collectionName} changed.`);
});

// Serve the React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
