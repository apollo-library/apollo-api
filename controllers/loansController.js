'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Extras
		utils		= require('../utils');

exports.getLoans = utils.asyncHandler(async (req, res) => {
	const loans = await db.collection('loans').find().toArray();

	var now = new Date();
	now.setHours(0,0,0,0);

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

exports.getOverdueLoans = utils.asyncHandler(async (req, res) => {
	const loans = await db.collection('loans').find().toArray();

	var now = new Date();
	now.setHours(0,0,0,0);

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

exports.getDueLoans = utils.asyncHandler(async (req, res) => {
	const loans = await db.collection('loans').find().toArray();

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
