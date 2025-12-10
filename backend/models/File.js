const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  originalname: { type: String, required: true },
  filename: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  privacy: { type: String, enum: ['public', 'private'], required: true },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploaded_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', FileSchema);
