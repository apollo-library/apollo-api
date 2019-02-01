'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),

// Extras
		utils	= require('../utils');

exports.getUser = utils.asyncHandler(async (req, res) => {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "003",
			message: "User not found"
		});
		return;
	}

	if (user.loanIDs && user.loanIDs.length) {
		const loans = await utils.getLoansForIDs(user.loanIDs, db);

		if (!loans) {
			res.json({
				code: "001",
				message: "Couldn't get loans"
			});
			return;
		}

		user.loans = loans;
	} else {
		user.loans = [];
	}
	delete user.loanIDs;

	user.fine = utils.calculateFine(user.loans);

	utils.logSuccess("User '" + req.params.userID + "' found");
	res.json({
		code: "000",
		message: "Success",
		data: user
	});
});

exports.updateUser = utils.asyncHandler(async (req, res) => {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "004",
			message: "User not found"
		});
		return;
	}

	let year = req.body.year;
	let reg = req.body.reg;

	if (year || reg) {
		if (!year) year = user.year;
		if (!reg) reg = user.reg;

		const yearInt = parseInt(year);

		if (isNaN(yearInt) || yearInt != 0 && (yearInt < 7 || yearInt > 13)) {
			res.json({
				code: "003",
				message: "Invalid year"
			});
			return;
		}

		if (!(() => {
			if (yearInt == 0) {
				return reg == "STAFF";
			} else if (yearInt > 11) {
				const regInt = parseInt(reg);
				if (isNaN(regInt)) return false;
				return (0 < regInt && regInt < 11);
			} else {
				return ["F", "H", "N", "P", "R", "T"].indexOf(reg) > -1;
			}
		})()) {
			res.json({
				code: "003",
				message: "Invalid reg"
			});
			return;
		}
	}

	try {
		await db.collection('users').findOneAndUpdate({_id: req.params.userID}, {$set: {
			forename:	req.body.forename	|| user.forename,
			surname:	req.body.surname	|| user.surname,
			name_concat: (req.body.forename || user.forename)
				+ ' ' + (req.body.surname	|| user.surname),
			year:		req.body.year		|| user.year,
			reg:		req.body.reg		|| user.reg,
			email:		req.body.email		|| user.email
		}});
	} catch (err) {
		utils.logError(err.message);
		res.json({
			code: "001",
			message: "Couldn't update user"
		});
		return;
	}

	utils.logSuccess("User '" + req.params.userID + "' successfully updated");
	res.json({
		code: "000",
		message: "Success"
	});
});

exports.deleteUser = utils.asyncHandler(async (req, res) => {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "002",
			message: "User not found"
		});
		return;
	}

	try {
		await db.collection('users').findOneAndUpdate({_id: user._id}, {
			$unset: {
				forename:		null,
				surname:		null,
				name_concat:	null,
				year:			null,
				reg:			null,
				email:			null
			}
		});
	} catch (err) {
		utils.logError(err);
		res.json({
			code: "001",
			message: "Couldn't delete user"
		});
		return;
	}

	utils.logSuccess("User '" + req.params.userID + "' successfully deleted");
	res.json({
		code: "000",
		message: "Success"
	});
});

exports.getHistory = utils.asyncHandler(async (req, res) => {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "003",
			message: "User not found"
		});
		return;
	}

	res.json({
		code: "000",
		message: "Success",
		data: (await db.collection('history').find().toArray())
			.filter(item => item.user == req.params.userID)
	});
});

exports.getLoanHistory = utils.asyncHandler(async (req, res) => {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "003",
			message: "User not found"
		});
		return;
	}

	res.json({
		code: "000",
		message: "Success",
		data: (await utils.getLoanData((await db.collection('loans').find().toArray()), db))
			.filter(loan => loan.user._id == req.params.userID).map(loan => {
				delete loan.user;
				return loan;
			})
	});
});
