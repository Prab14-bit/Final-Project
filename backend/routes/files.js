const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const File = require('../models/File');
const verifyToken = require('../middleware/verifyToken');

// Upload folder
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer setup
const storage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, uploadDir); },
  filename: function(req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'video/mp4'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  }
});

// Upload file
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { privacy } = req.body;
    const newFile = new File({
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      privacy,
      uploaded_by: req.user.id
    });
    await newFile.save();
    res.json({ message: 'File uploaded', file: newFile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get user files
router.get('/my-files', verifyToken, async (req, res) => {
  const files = await File.find({ uploaded_by: req.user.id });
  res.json({ files });
});

// Delete file
router.delete('/files/:id', verifyToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.uploaded_by.toString() !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    fs.unlinkSync(file.path);
    await file.remove();
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Download file
router.get('/files/:id/download', async (req, res) => {
  try {
    const file = await File.findById(req.params.id).populate('uploaded_by', 'username');
    if (!file) return res.status(404).send('File not found');
    if (file.privacy === 'private') {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return res.status(401).send('Unauthorized');
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.id !== file.uploaded_by._id.toString()) return res.status(403).send('Forbidden');
    }
    res.download(file.path, file.originalname);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Public files
router.get('/public-files', async (req, res) => {
  const files = await File.find({ privacy: 'public' }).populate('uploaded_by', 'username');
  res.json({ files });
});

module.exports = router;
