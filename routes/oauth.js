// Express setup
const   express     = require('express'),
		oauthRoutes	= express.Router();

// Import controllers
const usersController = require('../controllers/usersController');

module.exports = oauthRoutes;
