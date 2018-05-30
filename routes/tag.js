// Express setup
const   express     = require('express'),
		tagsRoutes	= express.Router();

// Import controllers
const tagController = require('../controllers/tagController');

tagsRoutes.route('/:tagID')
	.get(tagController.getTag)
	.post(tagController.editTag)

module.exports = tagsRoutes;
