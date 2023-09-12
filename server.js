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
    // Check if a user with the same username already exists
    const existingUser = await User.findOne({ username: req.body.username });

    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create a new user
    const { username, password } = req.body;
    const newUser = new User({ username });

    // Register the new user with Passport
    await User.register(newUser, password);

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
    // app.get('/home', async (req, res) => {
    //   try {
    //     const discussions = await Discussion.find().populate('user replies');
    
    //     res.render('home', { discussions, user: req.user });
    //   } catch (error) {
    //     console.error('Error fetching discussions:', error);
    //     res.status(500).send('Error fetching discussions');
    //   }
    // });
    app.get('/home', async (req, res) => {
      try {
        // Fetch discussions sorted by createdAt in descending order (most recent first)
        const discussions = await Discussion.find()
          .populate('user replies')
          .sort({ createdAt: -1 });
    
        res.render('home', { discussions, user: req.user });
      } catch (error) {
        console.error('Error fetching discussions:', error);
        res.status(500).send('Error fetching discussions');
      }
    });
 // Fetch and render the most replied discussions (new route)
app.get('/api/trending', async (req, res) => {
  try {
      const mostRepliedDiscussions = await Discussion.aggregate([
          {
              $project: {
                  _id: 1,
                  content: 1,
                  user: 1,
                  likes: 1,
                  dislikes: 1,
                  createdAt: 1,
                  repliesCount: { $size: "$replies" } // Calculate the number of replies
              }
          },
          { $sort: { repliesCount: -1 } }, // Sort by the number of replies in descending order
          { $limit: 5 } // Limit to the top 5 most replied discussions
      ]);

      // Render a separate EJS template for the most replied discussions
      res.json({ discussions: mostRepliedDiscussions });
  } catch (error) {
      // Handle errors
      console.error('Error fetching most replied discussions:', error);
      res.status(500).send('Internal Server Error');
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
 
    app.get('/discussion/:discussionId', async (req, res) => {
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
              })
  
          if (!discussion) {
              return res.status(404).json({ message: 'Discussion not found' });
          }
  
          // Render the 'discussion.ejs' template with the discussion and its replies
          res.render('discussion', { discussion, user: req.user });
      } catch (error) {
          console.error('Error fetching discussion:', error);
          res.status(500).json({ message: 'Error fetching discussion' });
      }
  });
  


  app.post('/discussion/:discussionId/replies', isLoggedIn, async (req, res) => {
    try {
      // Extract the discussion ID from the URL
      const discussionId = req.params.discussionId;
  
      // Find the discussion by its ID
      const discussion = await Discussion.findById(discussionId)
      .populate('user')
  
      if (!discussion) {
        return res.status(404).json({ message: 'Discussion not found' });
      }
  
      // Create a new reply using the data from the form submission
      const newReply = new Reply({
        content: req.body.content,
        user: req.user._id,
        discussion: discussion._id,
      });
  
      // Save the new reply to the database
      await newReply.save();
  
      // Update the discussion to include the new reply
      discussion.replies.push(newReply._id);
      await discussion.save();
  
      // Update the user to include the new reply
      req.user.replies.push(newReply._id);
      await req.user.save();
  
      // Send a response indicating success (you can customize this)
      res.redirect(`/discussion/${discussionId}`);

    } catch (error) {
      console.error('Error creating reply:', error);
      res.status(500).json({ message: 'Error creating reply' });
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
//--------------
    // Route to delete replies
    app.delete('/api/replies/:replyId', isLoggedIn, async (req, res) => {
      try {
          const reply = await Reply.findById(req.params.replyId);
  
          if (!reply) {
              return res.status(404).json({ message: 'Reply not found' });
          }
  
          // Check if the current user is the author of the reply
          if (reply.user.toString() !== req.user._id.toString()) {
              return res.status(403).json({ message: 'You are not authorized to delete this reply' });
          }
  
          // Delete the reply
          await Reply.findByIdAndDelete(req.params.replyId);
  
          res.status(200).json({ message: 'Reply deleted successfully' });
      } catch (error) {
          console.error('Error deleting reply:', error);
          res.status(500).json({ message: 'Error deleting reply' });
      }
  });
  
    //----------
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
    app.get('/member/:username', async (req, res) => {
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

// Render the search page
app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'search.html')); // Serve the search.html file
});


// Search discussions
app.get('/search/discussions', async (req, res) => {
  try {
      const searchTerm = req.query.q;
      const discussions = await Discussion.find({ content: { $regex: searchTerm, $options: 'i' } });
      res.json({ discussions });
  } catch (error) {
      console.error('Error searching discussions:', error);
      res.status(500).json({ message: 'Error searching discussions' });
  }
});

// Search users
app.get('/search/users', async (req, res) => {
  try {
      const searchTerm = req.query.q;
      const users = await User.find({ username: { $regex: searchTerm.toString(), $options: 'i' } });
      res.json({ users });
  } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: 'Error searching users' });
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
