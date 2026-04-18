const mongoose = require('mongoose');

const JobCacheSchema = new mongoose.Schema({
  query: { type: String, required: true, unique: true },
  jobs: { type: Array, default: [] },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobCache', JobCacheSchema);
