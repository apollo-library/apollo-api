const userRoutes = require('express').Router();
const userController = require('../controllers/userController');

userRoutes.route('/:userID')
	.get(userController.getUser)
	.post(userController.updateUser)
	.delete(userController.deleteUser)

userRoutes.route('/:userID/history')
	.get(userController.getHistory)

userRoutes.route('/:userID/history/loans')
	.get(userController.getLoanHistory)

module.exports = userRoutes;
