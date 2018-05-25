// Express setup
const   express     = require('express'),
		usersRoutes	= express.Router();

// Import controllers
const usersController = require('../controllers/usersController');

usersRoutes.route('/')
	.get(usersController.getUsers)
	.post(usersController.addUser)

module.exports = usersRoutes;
