'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		ObjectId	= require('mongodb').ObjectId,

// Extras
		utils		= require('../utils');

// Get loan info
exports.getLoan = utils.asyncHandler(async (req, res) => {
	// Check if loan in database
	const loan = await db.collection('loans').findOne({_id: new ObjectId(req.params.loanID)});
	if (!loan) {
		utils.logError("Loan '" + req.params.loanID + "' not found");
		res.json({
			code: "002",
			message: "Loan not found"
		});
		return;
	}

	// Find withdraw object in history
	const withdraw = await db.collection('history').findOne({_id: loan.withdrawID});
	if (!withdraw) {
		utils.logError("Withdrawal '" + loan.withdrawID + "' not found");
	}

	// Find book in database
	const book = await db.collection('books').findOne({_id: withdraw.book});
	if (!book) {
		utils.logError("Book '" + withdraw.book + "' not found");
	}

	// Find user in database
	const user = await db.collection('users').findOne({_id: withdraw.user});
	if (!user) {
		utils.logError("User '" + withdraw.user + "' not found");
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
