const express = require('express');
const File = require('../models/File');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// UPLOAD
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const file = new File({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      privacy: req.body.privacy,
      uploaded_by: req.user.id
    });

    await file.save();
    res.json({ message: 'File uploaded successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUBLIC FILES
router.get('/public-files', async (req, res) => {
  const files = await File.find({ privacy: 'public' });
  res.json(files);
});

// MY FILES
router.get('/my-files', auth, async (req, res) => {
  const files = await File.find({ uploaded_by: req.user.id });
  res.json(files);
});

module.exports = router;
