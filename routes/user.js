const userRoutes = require('express').Router();
const userController = require('../controllers/userController');

userRoutes.route('/:userID')
	.get(userController.getUser)
	.delete(userController.deleteUser)

userRoutes.route('/:userID/history')
	.get(userController.getHistory)

module.exports = userRoutes;
