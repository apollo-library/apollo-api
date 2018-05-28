// Express setup
const   express     = require('express'),
		userRoutes	= express.Router();

// Import controllers
const userController = require('../controllers/userController');

userRoutes.route('/:userID')
	.get(userController.getUser)
	.delete(userController.deleteUser)

userRoutes.route('/:userID/history')
	.get(userController.getHistory)

userRoutes.route('/:userID/history/loans')
	.get(userController.getHistoryLoans)

userRoutes.route('/:userID/history/fines')
	.get(userController.getHistoryFines)

module.exports = userRoutes;
