// Express setup
const	express         = require('express'),
		historyRoutes	= express.Router();

// Import controllers
const historyController = require('../controllers/historyController');

historyRoutes.route('/')
    .get(historyController.getHistory)

module.exports = historyRoutes;
