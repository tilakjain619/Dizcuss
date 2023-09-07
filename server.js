const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
// const User = require('../models/user');
const passportLocalMongoose = require('passport-local-mongoose');

require('dotenv').config();

// atlas connection
const atlasConnectionString = process.env.MONGODB_ATLAS_URI;

// local connection
// const mongoURI = 'mongodb://127.0.0.1:27017/dizcuss';
const app = express();
const port = 3000;
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/public')));
// app.use(express.static('public'));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  likedDiscussions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Discussion' }],
  dislikedDiscussions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Discussion' }],
  likedReplies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }],
  dislikedReplies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }],
  discussions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Discussion' }],
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }]
});
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model('User', userSchema);

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Define authentication middleware
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// app.get('/', (req, res) => {
//   res.send('Welcome to Dizcuss');
// });

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username });
    await User.register(user, password);

    res.redirect('/login'); // Redirect to login page after successful signup
  } catch (error) {
    res.render('signup'); // Render signup page again in case of error
  }
});



app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/home',
  failureRedirect: '/login'
}));

app.get('/logout', (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.error('Error logging out:', err);
    }
    res.redirect('/login');
  });
});


app.get('/profile', isLoggedIn, (req, res) => {
  res.render('profile', { user: req.user });
});

app.post('/update-profile', isLoggedIn, async (req, res) => {
  try {
    // Update user information
    const user = req.user;
    user.username = req.body.username;
    await user.setPassword(req.body.password);
    await user.save();

    // Redirect back to the profile page
    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});
// Define Mongoose schema and models
const discussionSchema = new mongoose.Schema({
  content: String,
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }]
});

const replySchema = new mongoose.Schema({
  content: String,
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  discussion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion',
  },
});

const Discussion = mongoose.model('Discussion', discussionSchema);
const Reply = mongoose.model('Reply', replySchema);

mongoose.connect(atlasConnectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Connected to MongoDB Database');

    // Create a new discussion and save it to the database
    app.post('/api/discussions', isLoggedIn, async (req, res) => {
      try {
        const newDiscussion = new Discussion({
          content: req.body.content,
          user: req.user._id
        });
        await newDiscussion.save();
        req.user.discussions.push(newDiscussion);
        await req.user.save();
        res.status(201).json(newDiscussion);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    });
    app.get('/home', async (req, res) => {
      try {
        const discussions = await Discussion.find().populate('user replies');
    
        res.render('home', { discussions, user: req.user });
      } catch (error) {
        console.error('Error fetching discussions:', error);
        res.status(500).send('Error fetching discussions');
      }
    });
    
 
    app.get('/api/discussions', async (req, res) => {
      try {
        // Fetch all discussions, and populate user and replies
        const discussions = await Discussion.find()
          .populate('user')
          .populate({
            path: 'replies',
            populate: {
              path: 'user',
            },
          });
    
        res.json(discussions);
      } catch (error) {
        console.error('Error fetching discussions:', error);
        res.status(500).json({ message: 'Error fetching discussions' });
      }
    });
    
    // Update the route to fetch a single discussion by ID
 
app.get('/api/discussions/:discussionId', async (req, res) => {
  try {
    const discussionId = req.params.discussionId;

    // Find the discussion by ID, populate its user and replies
    const discussion = await Discussion.findById(discussionId)
      .populate('user')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
        },
      });

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    res.json(discussion);
  } catch (error) {
    console.error('Error fetching discussion:', error);
    res.status(500).json({ message: 'Error fetching discussion' });
  }
});



    app.post('/api/discussions/:discussionId/replies', isLoggedIn, async (req, res) => {
      try {
        const discussion = await Discussion.findById(req.params.discussionId);
        if (!discussion) {
          return res.status(404).json({ message: 'Discussion not found' });
        }

        const newReply = new Reply({
          content: req.body.content,
          user: req.user._id,
          discussion: discussion._id, // Use discussion._id to associate the reply with the discussion
        });

        // Save the reply to the database
        await newReply.save();

        req.user.replies.push(newReply);
        await req.user.save();

        discussion.replies.push(newReply);
        await discussion.save();

        res.status(201).json(newReply);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    });



    app.delete('/api/discussions/:discussionId', isLoggedIn, async (req, res) => {
      try {
        const discussion = await Discussion.findById(req.params.discussionId);
    
        if (!discussion) {
          return res.status(404).json({ message: 'Discussion not found' });
        }
    
        // Check if the current user is the author of the discussion
        if (discussion.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'You are not authorized to delete this discussion' });
        }
    
        // Delete the discussion and associated replies
        await Discussion.findByIdAndDelete(req.params.discussionId);
        await Reply.deleteMany({ discussion: req.params.discussionId });
    
        res.status(200).json({ message: 'Discussion deleted successfully' });
      } catch (error) {
        console.error('Error deleting discussion:', error);
        res.status(500).json({ message: 'Error deleting discussion' });
      }
    });
    

    // Route for handling likes for discussion
    app.put('/api/likes/:discussionId', isLoggedIn, async (req, res) => {
      try {
        const discussion = await Discussion.findById(req.params.discussionId);

        if (!discussion) {
          return res.status(404).json({ message: 'Discussion not found' });
        }

        const user = req.user;

        // Check if the user has already liked this discussion
        if (user.likedDiscussions.includes(discussion._id)) {
          // If yes, remove the like
          user.likedDiscussions.pull(discussion._id);
          discussion.likes--;
        } else {
          // If no, add the like
          user.likedDiscussions.push(discussion._id);
          discussion.likes++;
        }

        // Save the changes
        await user.save();
        await discussion.save();

        res.json(discussion);
      } catch (error) {
        res.status(500).json({ message: 'Error updating likes' });
      }
    });

    // Route for handling dislikes for discussion
    app.put('/api/dislikes/:discussionId', isLoggedIn, async (req, res) => {
      try {
        const discussion = await Discussion.findById(req.params.discussionId);

        if (!discussion) {
          return res.status(404).json({ message: 'Discussion not found' });
        }

        const user = req.user;

        // Check if the user has already disliked this discussion
        if (user.dislikedDiscussions.includes(discussion._id)) {
          // If yes, remove the dislike
          user.dislikedDiscussions.pull(discussion._id);
          discussion.dislikes--;
        } else {
          // If no, add the dislike
          user.dislikedDiscussions.push(discussion._id);
          discussion.dislikes++;
        }

        // Save the changes
        await user.save();
        await discussion.save();

        res.json(discussion);
      } catch (error) {
        res.status(500).json({ message: 'Error updating dislikes' });
      }
    });



    // Route for handling likes for replies
    app.put('/api/likes/:replyId', isLoggedIn, async (req, res) => {
      try {
        const reply = await Reply.findById(req.params.replyId);

        if (!reply) {
          return res.status(404).json({ message: 'Reply not found' });
        }

        const user = req.user;

        // Check if the user has already liked this reply
        if (user.likedReplies.includes(reply._id)) {
          // If yes, remove the like
          user.likedReplies.pull(reply._id);
          reply.likes--;
        } else {
          // If no, add the like
          user.likedReplies.push(reply._id);
          reply.likes++;
        }

        // Save the changes
        await user.save();
        await reply.save();

        res.json(reply);
      } catch (error) {
        res.status(500).json({ message: 'Error updating likes' });
      }
    });

    // Similar route for disliking replies

    // Route for handling dislikes for replies
    app.put('/api/dislikes/:replyId', isLoggedIn, async (req, res) => {
      try {
        const reply = await Reply.findById(req.params.replyId);

        if (!reply) {
          return res.status(404).json({ message: 'Reply not found' });
        }

        const updatedReply = await Reply.findByIdAndUpdate(
          req.params.replyId,
          { $inc: { dislikes: 1 } }, // Increment the dislikes count by 1
          { new: true } // Return the updated reply
        );

        res.json(updatedReply);
      } catch (error) {
        res.status(500).json({ message: 'Error updating dislikes' });
      }
    });
    // Define a route to get a user's profile by username
    app.get('/:username', async (req, res) => {
      try {
        const { username } = req.params; // Extract the username from the URL parameters

        // Find the user by their username
        const user = await User.findOne({ username });

        if (!user) {
          // If the user doesn't exist, return a 404 response
          return res.status(404).json({ error: 'User not found' });
        }

        // Fetch discussions related to the user and populate their replies
        const discussions = await Discussion.find({ user: user._id })
          .populate('replies')
          .exec();

        // Render the 'user.ejs' template with the user and discussions data
        res.render('user', { user, discussions });
      } catch (error) {
        // Handle any errors that occur during data fetching
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });



    // starting server

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch(error => {
    console.error('Error connecting to MongoDB Atlas:', error);
  });
