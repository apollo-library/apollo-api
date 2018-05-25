// Express setup
const	express     = require('express'),
		booksRoutes	= express.Router();

// Import controllers
const booksController = require('../controllers/booksController');

booksRoutes.route('/')
	.get(booksController.getBooks)
	.post(booksController.addBook)

module.exports = booksRoutes;
