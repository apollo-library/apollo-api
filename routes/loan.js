const loanRoutes = require('express').Router();
const loanController = require('../controllers/loanController');

loanRoutes.route('/:loanID')
	.get(loanController.getLoan)

module.exports = loanRoutes;
