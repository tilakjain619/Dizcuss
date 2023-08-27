const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config();
const atlasConnectionString = process.env.MONGODB_ATLAS_URI;

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '/public')));
app.use(express.json());

// Define Mongoose schema and models
const discussionSchema = new mongoose.Schema({
  content: String,
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }]
});

const replySchema = new mongoose.Schema({
  content: String,
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 }
});

const Discussion = mongoose.model('Discussion', discussionSchema);
const Reply = mongoose.model('Reply', replySchema);

mongoose.connect(atlasConnectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB Atlas');

  // Create a new discussion and save it to the database
  app.post('/api/discussions', async (req, res) => {
    try {
      const newDiscussion = new Discussion(req.body);
      await newDiscussion.save();
      res.status(201).json(newDiscussion);
    } catch (error) {
      res.status(400).json({ message: error.message });
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

  app.post('/api/discussions/:discussionId/replies', async (req, res) => {
    try {
      const discussion = await Discussion.findById(req.params.discussionId);
      if (!discussion) {
        return res.status(404).json({ message: 'Discussion not found' });
      }
  
      const newReply = new Reply({
        content: req.body.content, // Assuming the content is sent in the request body
        likes: 0,
        dislikes: 0
      });
  
      await newReply.save(); // Save the new reply to the "replies" collection
  
      discussion.replies.push(newReply); // Push the new reply object, not just the ID
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
  

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
})
.catch(error => {
  console.error('Error connecting to MongoDB Atlas:', error);
});
