const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalname: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  privacy: { type: String, enum: ['public', 'private'], required: true },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploaded_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
