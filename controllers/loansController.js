'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Import middleware
		asyncHandler = require('../middleware').asyncHandler,

// Extras
		utils		= require('../utils'),
		logError	= utils.logError,
		logSuccess	= utils.logSuccess;

exports.getLoans = asyncHandler(async function(req, res) {
	res.json({
		code: "000",
		message: "Success",
		data: await db.collection('loans').find().toArray()
	});
});

exports.getOverdueLoans = asyncHandler(async function(req, res) {
	const loans = await db.collection('loans').find().toArray();

	var now = new Date();
	now.setHours(0,0,0,0);
	const overdue = loans.filter(loan => !loan.returnDate && loan.dueDate < now);
	res.json({
		code: "000",
		message: "Success",
		data: overdue
	});
});
