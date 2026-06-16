const express = require('express');
const { generateCV, compileLatex, confirmResume, getProfile } = require('../controllers/profileController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Setup multer for temporary local storage before passing to python script
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
  }
});
const upload = multer({ storage: storage });

// Routes
router.post('/generate-cv', upload.single('resumePdf'), generateCV);
router.post('/compile-latex', compileLatex);
router.post('/confirm-resume', confirmResume);
router.get('/:userId', getProfile);

module.exports = router;
