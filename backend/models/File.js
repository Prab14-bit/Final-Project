const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  path: String,
  size: Number,
  privacy: {
    type: String,
    enum: ['public', 'private'],
    default: 'private'
  },
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('File', FileSchema);
