'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),

// Extras
		utils	= require('../utils');

// Get user info
exports.getUser = utils.asyncHandler(async (req, res) => {
	// Check if user exists in database
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "003",
			message: "User not found"
		});
		return;
	}

	// If user has loans out, get the details for them
	if (user.loanIDs && user.loanIDs.length) {
		const loans = await utils.getLoansForIDs(user.loanIDs, db); // Get loan for all IDs

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

	delete user.loanIDs; // loanIDs doesn't need to be returned in the response

	user.fine = utils.calculateFine(user.loans); // Generate fine from loan objects

	utils.logSuccess("User '" + req.params.userID + "' found");
	res.json({
		code: "000",
		message: "Success",
		data: user
	});
});

exports.updateUser = utils.asyncHandler(async (req, res) => {
	// Check if user exists in database
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "004",
			message: "User not found"
		});
		return;
	}

	// year and reg objects for easy manipulation
	let year = req.body.year;
	let reg = req.body.reg;

	if (year || reg) {
		if (!year) year = user.year; // 
		if (!reg) reg = user.reg;

		const yearInt = parseInt(year);

		// If the provided year is invalid, return an error
		if (isNaN(yearInt) || yearInt != 0 && (yearInt < 7 || yearInt > 13)) {
			res.json({
				code: "003",
				message: "Invalid year"
			});
			return;
		}

		// Check if the reg is valid
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

	// Update user in database
	try {
		await db.collection('users').findOneAndUpdate({_id: req.params.userID}, {$set: {
			forename:	req.body.forename	|| user.forename,
			surname:	req.body.surname	|| user.surname,
			name_concat: (req.body.forename || user.forename)
				+ ' ' + (req.body.surname	|| user.surname),
			year:		req.body.year		|| user.year,
			reg:		req.body.reg		|| user.reg,
			email:		req.body.email		|| user.email,
			deleted: 	false
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

// Delete user
// Note: this doesn't actually delete the entry, rather sets a 'deleted' attribute to true and clears any identifying data from it
//       this stops any loan history from breaking by keeping the reference
exports.deleteUser = utils.asyncHandler(async (req, res) => {
	// Check if user exists in database
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "002",
			message: "User not found"
		});
		return;
	}

	// Remove identifying data from user
	try {
		await db.collection('users').findOneAndUpdate({_id: user._id}, {
			$set: {
				// Set both forename and name_concat to "Deleted" for frontend display purposes
				forename:		"Deleted",
				name_concat:	"Deleted",
				deleted:		true
			},
			$unset: {
				surname:		null,
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

// Get all history for a user
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

// Get loan history for a user
exports.getLoanHistory = utils.asyncHandler(async (req, res) => {
	// Check if user exists in database
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
				delete loan.user; // User is provided as input so doesn't need to be returned
				return loan;
			})
	});
});
