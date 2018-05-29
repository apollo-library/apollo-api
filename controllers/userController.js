'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),
		utils		= require('../utils'),
		logError	= utils.logError,
		logsuccess	= utils.logSuccess;

// Import middleware
const asyncHandler = require('../middleware').asyncHandler;

exports.getUser = asyncHandler(async function(req, res) {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "003",
			message: "User not found"
		});
		return;
	}

	logSuccess("User '" + req.params.userID + "' Found");
	res.json({
		code: "000",
		message: "Success",
		user: user
	});
});

exports.deleteUser = asyncHandler(async function(req, res) {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "002",
			message: "User not found"
		});
		return;
	}

	try {
		await db.collection('users').remove({_id: user._id});
	} catch (err) {
		logError(err);
		res.json({
			code: "001",
			message: "Couldn't delete user"
		});
		return;
	}

	logSuccess("User '" + req.params.userID + "' Successfully deleted");
	res.json({
		code: "000",
		message: "Success"
	});
});

exports.getHistory = asyncHandler(async function(req, res) {
	res.json({function: "getHistory", userID: req.params.userID});
});

exports.getHistoryLoans = asyncHandler(async function(req, res) {
	res.json({function: "getHistoryLoans", userID: req.params.userID});
});

exports.getHistoryFines = asyncHandler(async function(req, res) {
	res.json({function: "getHistoryFines", userID: req.params.userID});
});
