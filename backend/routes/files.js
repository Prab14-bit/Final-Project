// backend/routes/files.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const File = require('../models/File');
const verifyToken = require('../middleware/verifyToken');

// Upload folder
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'video/mp4'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  }
});

// --------------------
// Upload file
// --------------------
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { privacy } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const newFile = new File({
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      privacy,
      uploaded_by: req.user.id
    });

    await newFile.save();
    res.json({ message: 'File uploaded successfully', file: newFile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --------------------
// Get user's files
// --------------------
router.get('/my-files', verifyToken, async (req, res) => {
  try {
    const files = await File.find({ uploaded_by: req.user.id });
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// Delete file
// --------------------
router.delete('/files/:id', verifyToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (file.uploaded_by.toString() !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    // Safe deletion
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    await file.remove();
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// Download file
// --------------------
router.get('/files/:id/download', async (req, res) => {
  try {
    const file = await File.findById(req.params.id).populate('uploaded_by', 'username');
    if (!file) return res.status(404).send('File not found');

    // Private file authorization
    if (file.privacy === 'private') {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return res.status(401).send('Unauthorized');

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.id !== file.uploaded_by._id.toString())
        return res.status(403).send('Forbidden');
    }

    // Check file exists
    if (!fs.existsSync(file.path)) return res.status(404).send('File missing on server');

    res.download(file.path, file.originalname);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --------------------
// Get public files
// --------------------
router.get('/public-files', async (req, res) => {
  try {
    const files = await File.find({ privacy: 'public' }).populate('uploaded_by', 'username');
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
