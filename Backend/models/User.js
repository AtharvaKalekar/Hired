const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false, // Don't return password by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  githubUrl: {
    type: String,
    default: '',
  },
  linkedinUrl: {
    type: String,
    default: '',
  },
  leetcodeUrl: {
    type: String,
    default: '',
  },
  cvLatex: {
    type: String,
    default: '',
    select: false, // Prevents loading the massive string on every user query unless explicitly requested
  },
  githubData: {
    type: String,
    default: '',
  },
  leetcodeData: {
    type: String,
    default: '',
  },
  resumeData: {
    type: String,
    default: '',
  },
  linkedinData: {
    type: String,
    default: '',
  },
  githubReposData: {
    type: String,
    default: '',
  },
  savedJobs: {
    type: Array,
    default: []
  },
  dislikedJobs: {
    type: Array,
    default: []
  },
  jobKeywords: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
