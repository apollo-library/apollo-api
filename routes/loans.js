const loansRoutes = require('express').Router();
const loansController = require('../controllers/loansController');

loansRoutes.route('/')
	.get(loansController.getLoans)

loansRoutes.route('/overdue')
	.get(loansController.getOverdueLoans)

loansRoutes.route('/due')
	.get(loansController.getDueLoans)

module.exports = loansRoutes;
