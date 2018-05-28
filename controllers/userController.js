'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),
		client	= mongo.client();

// Import middleware
const asyncHandler = require('../middleware').asyncHandler;

exports.getUser = asyncHandler(async function(req, res) {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		console.log("User '" + req.params.userID + "' Not Found");
		res.json({
			code: "003",
			message: "User Not Found"
		});
		return;
	}

	console.log("User '" + req.params.userID + "' Found");
	res.json({
		code: "000",
		message: "Success",
		user: user
	});
});

exports.deleteUser = asyncHandler(async function(req, res) {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		console.log("User '" + req.params.userID + "' Not Found");
		res.json({
			code: "002",
			message: "User Not Found"
		});
		return;
	}

	try {
		await db.collection('users').remove({_id: user._id});
	} catch (err) {
		console.log(err);
		res.json({
			code: "001",
			message: "Couldn't Delete User"
		});
		return;
	}

	console.log("User '" + req.params.userID + "' Successfully Deleted");
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
