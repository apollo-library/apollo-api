// Express setup
const	express     = require('express'),
		booksRoutes	= express.Router();

// Import controllers
const booksController = require('../controllers/booksController');

booksRoutes.route('/')
	.get(booksController.getBooks)
	.post(booksController.addBook)

booksRoutes.route('/search')
	.post(booksController.searchBooks)

module.exports = booksRoutes;
