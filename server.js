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
  gender: String,
  fullName: String,
  birthDate: Date,
  likedDiscussions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Discussion' }],
  likedReplies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }],
  discussions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Discussion' }],
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Store user IDs that this user is following
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isAdmin: { type: Boolean, default: false }
});
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model('User', userSchema);

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: 'Permission denied' });
};
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
app.get('/about', (req, res) => {
  res.render('about');
});

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

    // // Create a new user
    // const { username, password } = req.body;
    // const newUser = new User({ username });

    // Create a new user with additional details
    const { username, password, gender, fullName, birthDate } = req.body;
    const newUser = new User({ username, gender, fullName, birthDate });

    // Register the new user with Passport
    await User.register(newUser, password);

    res.redirect('/login?message=Successfully signed up! Now, login'); // Redirect to login page after successful signup
  } catch (error) {
    res.render('signup'); // Render signup page again in case of error
  }
});




app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/home',
  failureRedirect: '/login?message=Incorrect Information'
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
    // res.status(500).json({ message: 'Error updating profile' });
    res.render('error', { message: 'Something went wrong! Maybe you left some inputs empty 🤔' });
  }
});
// Create a new route for account deletion
app.post('/delete-account', isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete all discussions created by the user
    await Discussion.deleteMany({ user: userId });

    // Delete all replies created by the user
    await Reply.deleteMany({ user: userId });

    // Delete the user's account
    await User.findByIdAndDelete(userId);

    // Redirect to the login page or any other appropriate page
    res.redirect('/login?message=Account Deleted Successfully');
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Error deleting account' });
  }
});

// Define Mongoose schema and models
const discussionSchema = new mongoose.Schema({
  content: String,
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }],
  reported: { type: Boolean, default: false },
  reportReason: String,
  reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const replySchema = new mongoose.Schema({
  content: String,
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  discussion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion',
  },
  reported: { type: Boolean, default: false },
  reportReason: String,
  reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
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
            options: { sort: { createdAt: -1 } }, // Sort replies by createdAt in descending order
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
          createdAt: new Date()
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

          discussion.likes++;

        // Save the changes
        await user.save();
        await discussion.save();

        res.json(discussion);
      } catch (error) {
        res.status(500).json({ message: 'Error updating likes' });
      }
    });



    // // Route for handling likes for replies
    // app.put('/api/likes/:replyId', isLoggedIn, async (req, res) => {
    //   try {
    //     const reply = await Reply.findById(req.params.replyId);

    //     if (!reply) {
    //       return res.status(404).json({ message: 'Reply not found' });
    //     }

    //     const user = req.user;

    //       reply.likes++;


    //     // Save the changes
    //     await user.save();
    //     await reply.save();

    //     res.json(reply);
    //   } catch (error) {
    //     res.status(500).json({ message: 'Error updating likes' });
    //   }
    // });

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

        // Fetch replies made by the user
        const userReplies = await Reply.find({ user: user._id })
          .populate('discussion')
          .exec();

        console.log('User Replies:', userReplies); // Add this line

        // Render the 'user.ejs' template with the user, discussions, and userReplies data
        res.render('user', { user, discussions, userReplies });

        // Render the 'user.ejs' template with the user, discussions, and userReplies data
        // res.render('user', { user, discussions, userReplies });
      } catch (error) {
        // Handle any errors that occur during data fetching
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });


    // Render the search page
    app.get('/search', (req, res) => {
      res.render('search');
    });
    app.get('/discussion', (req, res) => {
      res.redirect(`/home`);
    })

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

// Route to follow another user
app.post('/follow/:userId', isLoggedIn, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);

    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user is already following the target user
    if (!req.user.following.includes(userToFollow._id)) {
      req.user.following.push(userToFollow._id); // Add the user to the "following" list
      await req.user.save();

      userToFollow.followers.push(req.user._id); // Add the follower to the "followers" list of the user being followed
      await userToFollow.save();
    }

    res.json({ isFollowing: true }); // Indicate that the user is now following
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ message: 'Error following user', error: error.message });
  }
});

// Route to unfollow another user
app.post('/unfollow/:userId', isLoggedIn, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.userId);
    if (!userToUnfollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    const index = req.user.following.indexOf(userToUnfollow._id);
    if (index !== -1) {
      req.user.following.splice(index, 1);
      await req.user.save();

      const followerIndex = userToUnfollow.followers.indexOf(req.user._id);
      if (followerIndex !== -1) {
        userToUnfollow.followers.splice(followerIndex, 1);
        await userToUnfollow.save();
      }

      // console.log('Successfully unfollowed user:', userToUnfollow.username);
      res.json({ isFollowing: false });
    } else {
      // console.log('User was not following:', userToUnfollow.username);
      res.json({ isFollowing: false }); // User was not following, so no changes
    }
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Error unfollowing user' });
  }
});

    // Route to check follow status (GET request)
    app.get('/follow/status/:userId', isLoggedIn, async (req, res) => {
      try {
        const userToCheck = await User.findById(req.params.userId);
        if (!userToCheck) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user is following the target user
        const isFollowing = req.user.following.includes(userToCheck._id);

        res.json({ isFollowing });
      } catch (error) {
        console.error('Error checking follow status:', error);
        res.status(500).json({ message: 'Error checking follow status' });
      }
    });
    // Example Express.js route to toggle follow/unfollow
    app.post('/toggleFollow/:userId', isLoggedIn, async (req, res) => {
      try {
        const userToToggle = await User.findById(req.params.userId);
        if (!userToToggle) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user is following the target user
        const index = req.user.following.indexOf(userToToggle._id);
        if (index !== -1) {
          // User is following, unfollow them
          req.user.following.splice(index, 1); // Remove the user from the "following" list
        } else {
          // User is not following, follow them
          req.user.following.push(userToToggle._id); // Add the user to the "following" list
        }

        await req.user.save();

        res.json({ isFollowing: req.user.following.includes(userToToggle._id) });
      } catch (error) {
        console.error('Error toggling follow status:', error);
        res.status(500).json({ message: 'Error toggling follow status' });
      }
    });
    
    
    // Route to fetch discussions from followed users
    app.get('/feed', isLoggedIn, async (req, res) => {
      try {
        // Retrieve discussions from users in the "following" list
        const discussions = await Discussion.find({ user: { $in: req.user.following } })
          .populate('user replies')
          .sort({ createdAt: -1 });

        res.render('feed', { discussions, user: req.user });
        // res.json({discussions, user: req.user})
      } catch (error) {
        console.error('Error fetching feed:', error);
        res.status(500).send('Error fetching feed');
      }
    });

    // Defining a new Mongoose schema for support requests
const supportSchema = new mongoose.Schema({
  type: String, // Feedback, Contact, Complaint, etc.
  content: String,
  contactInfo: String,
  createdAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
});

const SupportRequest = mongoose.model('SupportRequest', supportSchema);

app.get('/support', (req, res) => {
  res.render('support');
});

// Create a new route for the /admin page
app.get('/admin', isAdmin, async (req, res) => {
  try {
    // Use Mongoose queries to count the total number of discussions and replies
    const totalDiscussions = await Discussion.countDocuments();
    const totalReplies = await Reply.countDocuments();

    // Render an admin dashboard page with the count of discussions and replies
    res.render('admin', { totalDiscussions, totalReplies, user: req.user });
  } catch (error) {
    console.error('Error fetching admin data:', error);
    res.status(500).json({ message: 'Error fetching admin data' });
  }
});
// Creating a new route for submitting support requests
app.post('/support/submit', async (req, res) => {
  try {
      const { type, content, contactInfo } = req.body;
      const newRequest = new SupportRequest({ type, content, contactInfo });
      await newRequest.save();
      res.redirect('/support?message=Request submitted successfully');
  } catch (error) {
      res.redirect('/support?message=Error submitting request');
  }
});

app.get('/admin/support', isAdmin, async (req, res) => {
  try {
      const filter = req.query.filter;
      // Fetch contactMessages, feedbackMessages, and complaintMessages based on the filter
      // For example, you might use different Mongoose queries based on the filter value
      const contactMessages = await SupportRequest.find({ type: 'contact' }).sort({ createdAt: -1 });
      const feedbackMessages = await SupportRequest.find({ type: 'feedback' }).sort({ createdAt: -1 });
      const complaintMessages = await SupportRequest.find({ type: 'complaint' }).sort({ createdAt: -1 });
      // Fetch supportRequests as well
      const supportRequests = await SupportRequest.find().sort({ createdAt: -1 });


      res.json({ requests: supportRequests, contactMessages, feedbackMessages, complaintMessages });

  } catch (error) {
      res.status(500).json({ message: 'Error fetching support requests' });
  }
});
app.get('/admin/messages', isAdmin, async (req, res) =>{
  const filter = req.query.filter;
      // Fetch contactMessages, feedbackMessages, and complaintMessages based on the filter
      // For example, you might use different Mongoose queries based on the filter value
      const contactMessages = await SupportRequest.find({ type: 'contact' }).sort({ createdAt: -1 });
      const feedbackMessages = await SupportRequest.find({ type: 'feedback' }).sort({ createdAt: -1 });
      const complaintMessages = await SupportRequest.find({ type: 'complaint' }).sort({ createdAt: -1 });
      // Fetch supportRequests as well
      const supportRequests = await SupportRequest.find().sort({ createdAt: -1 });
  res.render('admin-support', { requests: supportRequests, contactMessages, feedbackMessages, complaintMessages, filter });
})
// Endpoint to delete a support request
app.delete('/admin/support/delete/:requestId', async (req, res) => {
  try {
    const requestId = req.params.requestId;

    // Use Mongoose to find and delete the request by ID
    const deletedRequest = await SupportRequest.findByIdAndDelete(requestId);

    if (deletedRequest) {
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error deleting support request:', error);
    res.status(500).json({ message: 'Error deleting support request' });
  }
});

    app.get('/admin/reported-content', isAdmin, async (req, res) => {
      try {
        // Fetch reported content from the database
        const reportedDiscussions = await Discussion.find({ reported: true }).populate('user');
        const reportedReplies = await Reply.find({ reported: true }).populate('user');

        res.render('admin-report', { reportedDiscussions, reportedReplies });
      } catch (error) {
        console.error('Error fetching reported content:', error);
        res.status(500).json({ message: 'Error fetching reported content' });
      }
    });
    app.post('/api/report', isLoggedIn, async (req, res) => {
      try {
        const { id, type, reason } = req.body;

        // Check if the type is 'discussion' or 'reply' and validate input

        // Find the content by ID and update its report status and reasons
        const content = type === 'discussion'
          ? await Discussion.findById(id)
          : await Reply.findById(id);

        if (!content) {
          return res.status(404).json({ message: 'Content not found' });
        }

        content.reported = true;
        content.reportReason = reason;
        content.reportedBy.push(req.user._id);

        await content.save();

        res.status(201).json({ message: 'Content reported successfully' });
      } catch (error) {
        console.error('Error reporting content:', error);
        res.status(500).json({ message: 'Error reporting content' });
      }
    });
  // Admin approves reported content
app.get('/admin/approve-report/:type/:id', isAdmin, async (req, res) => {
  try {
    const { type, id } = req.params;

    if (type !== 'discussion' && type !== 'reply') {
      return res.status(400).json({ message: 'Invalid content type' });
    }

    // Find the content by ID and update its report status and reasons
    const content = type === 'discussion'
      ? await Discussion.findById(id)
      : await Reply.findById(id);

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Ensure that only admins can approve
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Perform the approval logic
    content.reported = false;
    content.reportReason = '';
    await content.save();

    res.status(200).json({ message: 'Content approved successfully' });
  } catch (error) {
    console.error('Error approving content:', error);
    res.status(500).json({ message: 'Error approving content' });
  }
});

// Admin deletes reported content
app.get('/admin/delete-report/:type/:id', isAdmin, async (req, res) => {
  try {
    const { type, id } = req.params;

    if (type !== 'discussion' && type !== 'reply') {
      return res.status(400).json({ message: 'Invalid content type' });
    }

    // Find the content by ID and ensure it exists
    const content = type === 'discussion'
      ? await Discussion.findById(id)
      : await Reply.findById(id);

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Ensure that only admins can delete
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Perform the deletion logic
    if (type === 'discussion') {
      // If it's a discussion, delete the discussion and associated replies
      await Discussion.findByIdAndDelete(id);
      await Reply.deleteMany({ discussion: id });
    } else {
      // If it's a reply, just delete the reply
      // await content.remove(); // or use another appropriate method to delete
      await Reply.findByIdAndDelete(id);
    }

    res.status(200).json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ message: 'Error deleting content' });
  }
});


    app.post('/report', async (req, res) => {
      try {
        const { contentId, contentType, reason } = req.body;
        const reporterId = req.user._id; // Assuming you have authentication in place

        const report = await reportContent(contentId, contentType, reporterId, reason);

        res.status(201).json({ message: 'Content reported successfully', report });
      } catch (error) {
        res.status(500).json({ message: 'Error reporting content', error: error.message });
      }
    });


    // always keep below code at end to prevent any 404 error
    // 404 not found
    app.use((req, res, next) => {
      res.status(404).render('404'); // Render your custom 404 page
    });
    // some error
    app.use((req, res, next) => {
      res.status(500).render('error'); // Render your custom 404 page
    });
    // starting server

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch(error => {
    console.error('Error connecting to MongoDB Atlas:', error);
  });
