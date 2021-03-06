'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),

// Extras
		utils	= require('../utils');

// Get info for all users
exports.getUsers = utils.asyncHandler(async (req, res) => {
	res.json({
		code: "000",
		message: "Success",
		data: await Promise.all((await db.collection('users').find().toArray()).map(async user => {
			let loans = [];
			if (user.loanIDs && user.loanIDs.length) {
				loans = await utils.getLoansForIDs(user.loanIDs, db);
			}

			user.fine = utils.calculateFine(loans || []);
			return user;
		}))
	});
});

// Add user
exports.addUser = utils.asyncHandler(async (req, res) => {
	// Check all parameters are specified
	if (!req.body.id) {
		res.json({
			code: "003",
			message: "No ID specified"
		});
		return;
	}

	if (!req.body.forename) {
		res.json({
			code: "003",
			message: "No forename specified"
		});
		return;
	}

	if (!req.body.surname) {
		res.json({
			code: "003",
			message: "No surname specified"
		});
		return;
	}

	if (!req.body.year) {
		res.json({
			code: "003",
			message: "No year specified"
		});
		return;
	}

	if (!req.body.reg) {
		res.json({
			code: "003",
			message: "No reg specified"
		});
		return;
	}

	if (!req.body.email) {
		res.json({
			code: "003",
			message: "No email specified"
		});
		return;
	}

	// Check if specified year is invalid
	const yearInt = parseInt(req.body.year);

	if (isNaN(yearInt) || yearInt != 0 && (yearInt < 7 || yearInt > 13)) {
		res.json({
			code: "003",
			message: "Invalid year"
		});
		return;
	}

	// Check if reg is valid
	if (!(() => {
		if (yearInt == 0) {
			return req.body.reg == "STAFF";
		} else if (yearInt > 11) {
			const regInt = parseInt(req.body.reg);
			if (isNaN(regInt)) return false;
			return (0 < regInt && regInt < 11);
		} else {
			return ["F", "H", "N", "P", "R", "T"].indexOf(req.body.reg) > -1;
		}
	})()) {
		res.json({
			code: "003",
			message: "Invalid reg"
		});
		return;
	}

	// Check if user is already in the database
	const user = await db.collection('users').findOne({_id: req.body.id});
	if (user) {
		utils.logError("User '" + req.body.id + "' already exists");
		res.json({
			code: "004",
			message: "User already exists"
		});
		return;
	}

	// Add user to database
	try {
		await db.collection('users').insertOne({
			_id: req.body.id,
			forename: req.body.forename,
			surname: req.body.surname,
			name_concat: req.body.forename + ' ' + req.body.surname,
			year: req.body.year,
			reg: req.body.reg,
			email: req.body.email,
			deleted: false
		});
	} catch (err) {
		utils.logError(err.message);
		res.json({
			code: "001",
			message: "Couldn't add book"
		});
		return;
	}

	utils.logSuccess("User '" + req.body.id + "' successfully added");
	res.json({
		code: "000",
		message: "Success"
	});
});
