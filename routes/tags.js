// Express setup
const   express     = require('express'),
		tagsRoutes	= express.Router();

// Import controllers
const tagsController = require('../controllers/tagsController');

tagsRoutes.route('/')
	.get(tagsController.getTags)
	.post(tagsController.addTag)

module.exports = tagsRoutes;
