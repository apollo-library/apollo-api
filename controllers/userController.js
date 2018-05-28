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
		res.json({error: "User doesn't exist"});
		return;
	}

	res.json({message: "Success", user: user});
});

exports.deleteUser = asyncHandler(async function(req, res) {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		res.json({error: "User doesn't exist"});
		return;
	}

	try {
		await db.collection('users').remove({_id: user._id});
	} catch (err) {
		console.log(err);
		res.json({error: "Couldn't delete user"});
		return;
	}

	res.json({message: "Success"});
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
