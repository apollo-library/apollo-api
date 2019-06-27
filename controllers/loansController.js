'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),

// Extras
		utils	= require('../utils');

//Get all loans data
exports.getLoans = utils.asyncHandler(async (req, res) => {
	const loans = await db.collection('loans').find().toArray();

	// Get all loans currently out
	const allData = await utils.getLoanData(loans.filter(loan => !loan.returnDate), db);

	if (!allData) {
		res.json({
			code: "001",
			message: "Couldn't get loans"
		});
		return;
	}

	res.json({
			code: "000",
			message: "Success",
			count: allData.length,
			data: allData
		});
});

// Get all overdue loans
exports.getOverdueLoans = utils.asyncHandler(async (req, res) => {
	const loans = await db.collection('loans').find().toArray(); // Get all loans from database

	// now is a Date object set at midnight
	var now = new Date();
	now.setHours(0,0,0,0);

	// Get all loans currently out with a due date before midnight today
	const allData = await utils.getLoanData(loans.filter(loan => !loan.returnDate && loan.dueDate < now), db);

	if (!allData) {
		res.json({
			code: "001",
			message: "Couldn't get loans"
		});
		return;
	}

	res.json({
			code: "000",
			message: "Success",
			count: allData.length,
			data: allData
		});
});

// Get all loans due soon or overdue
exports.getDueLoans = utils.asyncHandler(async (req, res) => {
	const loans = await db.collection('loans').find().toArray();

	// date is a Date object set at midnight 3 days in the future
	// This sets the bounds for a 'due' book as one that needs to be returned in the next 3 days (or overdue)
	var date = new Date();
	date.setHours(0,0,0,0);
	date.setDate(date.getDate() + 3);

	const allData = await utils.getLoanData(loans.filter(loan => !loan.returnDate && loan.dueDate < date), db);

	if (!allData) {
		res.json({
			code: "001",
			message: "Couldn't get loans"
		});
		return;
	}

	res.json({
			code: "000",
			message: "Success",
			count: allData.length,
			data: allData
		});
});
