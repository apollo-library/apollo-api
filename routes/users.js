const usersRoutes = require('express').Router();
const usersController = require('../controllers/usersController');

usersRoutes.route('/')
	.get(usersController.getUsers)
	.post(usersController.addUser)

module.exports = usersRoutes;
