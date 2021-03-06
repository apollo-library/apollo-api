const bookRoutes = require('express').Router();
const bookController = require('../controllers/bookController');

// Book info
bookRoutes.route('/:bookID')
	.get(bookController.getBook)
	.post(bookController.editBook)
	.delete(bookController.deleteBook)

// Book loaning and management
bookRoutes.route('/:bookID/withdraw')
	.post(bookController.withdrawBook)

bookRoutes.route('/:bookID/deposit')
	.get(bookController.depositBook)

bookRoutes.route('/:bookID/reserve')
	.post(bookController.reserveBook)

bookRoutes.route('/:bookID/reservation')
	.get(bookController.getReservation)
	.delete(bookController.deleteReservation)

bookRoutes.route('/:bookID/renew')
	.post(bookController.renewBook)

// Loans information
bookRoutes.route('/:bookID/loan')
	.get(bookController.getCurrentLoan)

bookRoutes.route('/:bookID/history')
	.get(bookController.getHistory)

bookRoutes.route('/:bookID/history/users')
	.get(bookController.getUserHistory)

module.exports = bookRoutes;
