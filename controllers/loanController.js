'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),
		ObjectId	= require('mongodb').ObjectId,

// Extras
		utils		= require('../utils');

exports.getLoan = utils.asyncHandler(async (req, res) => {
	const loans = await db.collection('loans').find().toArray();

	const loan = await db.collection('loans').findOne({_id: new ObjectId(req.params.loanID)});
	if (!loan) {
		utils.logError("Loan '" + req.params.loanID + "' not found");
		res.json({
			code: "002",
			message: "Loan not found"
		});
		return;
	}

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

	utils.logSuccess("Loan '" + req.params.loanID + "' found");
	res.json({
		code: "000",
		message: "Success",
		data: {
			loan: loan,
			book: book,
			user: user
		}
	});
});
