'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Extras
		utils		= require('../utils');

async function getLoanData(loans) {
	let error = false;

	const loanData = await Promise.all(loans.map(async loan => {
		const withdraw = await db.collection('history').findOne({_id: loan.withdrawID});
		if (!withdraw) {
			utils.logError("Withdrawal '" + loan.withdrawID + "' not found");
			error = true;
		}

		const book = await db.collection('books').findOne({_id: withdraw.book});
		if (!book) {
			utils.logError("Book '" + withdraw.book + "' not found");
			error = true;
		}

		const user = await db.collection('users').findOne({_id: withdraw.user});
		if (!user) {
			utils.logError("User '" + withdraw.user + "' not found");
			error = true;
		}

		return {
			loan: loan,
			book: book,
			user: user
		}
	}));

	return (error) ? undefined : loanData
}

exports.getLoans = utils.asyncHandler(async (req, res) => {
	const loans = await db.collection('loans').find().toArray();

	var now = new Date();
	now.setHours(0,0,0,0);

	const allData = await getLoanData(loans.filter(loan => !loan.returnDate));

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

	let error = false;
	const allData = await getLoanData(loans.filter(loan => !loan.returnDate && loan.dueDate < now));

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
