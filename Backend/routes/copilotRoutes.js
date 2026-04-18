const express = require('express');
const router = express.Router();
const copilotController = require('../controllers/copilotController');

router.post('/find-people', copilotController.findPeople);
router.post('/referral', copilotController.generateReferral);

module.exports = router;
