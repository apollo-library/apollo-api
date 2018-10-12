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
	loans.forEach(loan => {
		console.log(loan._id);
	});

	const loan = await db.collection('loans').findOne({_id: new ObjectId(req.params.loanID)});
	if (!loan) {
		utils.logError("Loan '" + req.params.loanID + "' not found");
		res.json({
			code: "002",
			message: "Loan not found"
		});
		return;
	}

	utils.logSuccess("Loan '" + req.params.loanID + "' found");
	res.json({
		code: "000",
		message: "Loan found",
		data: loan
	});
});
