'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Extras
		utils		= require('../utils');

exports.getLoans = utils.asyncHandler(async (req, res) => {
	res.json({
		code: "000",
		message: "Success",
		data: await db.collection('loans').find().toArray()
	});
});

exports.getOverdueLoans = utils.asyncHandler(async (req, res) => {
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
