const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require('passport-local-mongoose');

require('dotenv').config();
// atlas connection
// const atlasConnectionString = process.env.MONGODB_ATLAS_URI;

// local connection
const mongoURI = 'mongodb://127.0.0.1:27017/dizcuss';
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
    res.redirect('/login');
  } catch (error) {
    res.render('signup');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/profile',
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
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }]
});

const replySchema = new mongoose.Schema({
  content: String,
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Discussion = mongoose.model('Discussion', discussionSchema);
const Reply = mongoose.model('Reply', replySchema);

mongoose.connect(mongoURI, {
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
        res.render('home', { discussions }); // Render the 'home.ejs' template with discussions data
      } catch (error) {
        console.error('Error fetching discussions:', error);
        res.status(500).send('Error fetching discussions');
      }
    });
    // Get all discussions
    app.get('/api/discussions', async (req, res) => {
      try {
        const discussions = await Discussion.find().populate('replies');
        res.json(discussions);
      } catch (error) {
        res.status(500).json({ message: error.message });
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
          user: req.user._id
        });
    
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


    app.delete('/api/discussions/:discussionId', async (req, res) => {
      try {
        const discussion = await Discussion.findByIdAndDelete(req.params.discussionId);
        if (!discussion) {
          return res.status(404).json({ message: 'Discussion not found' });
        }
        res.status(200).json({ message: 'Discussion deleted successfully' });
      } catch (error) {
        console.error('Error deleting discussion:', error); // Log the actual error
        res.status(500).json({ message: 'Error deleting discussion' });
      }
    });

    // ...

    // Update the likes for a reply
    app.put('/api/like/:replyId', async (req, res) => {
      try {
        const reply = await Reply.findByIdAndUpdate(
          req.params.replyId,
          { $inc: { likes: 1 } }, // Increment the likes count by 1
          { new: true } // Return the updated reply
        );

        if (!reply) {
          return res.status(404).json({ message: 'Reply not found' });
        }

        res.json(reply);
      } catch (error) {
        res.status(500).json({ message: 'Error updating likes' });
      }
    });

    // Update the dislikes for a reply
    app.put('/api/dislike/:replyId', async (req, res) => {
      try {
        const reply = await Reply.findByIdAndUpdate(
          req.params.replyId,
          { $inc: { dislikes: 1 } }, // Increment the dislikes count by 1
          { new: true } // Return the updated reply
        );

        if (!reply) {
          return res.status(404).json({ message: 'Reply not found' });
        }

        res.json(reply);
      } catch (error) {
        res.status(500).json({ message: 'Error updating dislikes' });
      }
    });

    // ...

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch(error => {
    console.error('Error connecting to MongoDB Atlas:', error);
  });
