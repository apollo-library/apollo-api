// Express setup
const   express     = require('express'),
		loansRoutes	= express.Router();

// Import controllers
const loansController = require('../controllers/loansController');

loansRoutes.route('/')
	.get(loansController.getLoans)

loansRoutes.route('/overdue')
	.get(loansController.getOverdueLoans)

module.exports = loansRoutes;
