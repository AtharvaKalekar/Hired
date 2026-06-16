const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

router.get('/matched/:userId', jobController.getMatchedJobs);
router.post('/custom-search/:userId', jobController.customSearchJobs);
router.get('/search-stream', jobController.searchStream);
router.post('/swipe/:userId', jobController.swipeJob);
router.get('/saved/:userId', jobController.getSavedJobs);
router.post('/apply/:userId', jobController.generateApplicationPackage);
router.get('/internships/:userId', jobController.getInternships);
router.get('/events', jobController.getEvents);

module.exports = router;
