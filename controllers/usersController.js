'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Import middleware
		asyncHandler = require('../middleware').asyncHandler,

// Extras
		utils		= require('../utils'),
		logError	= utils.logError,
		logSuccess	= utils.logSuccess;

exports.getUsers = asyncHandler(async function(req, res) {
	res.json({
		code: "000",
		message: "Success",
		users: await db.collection('users').find().toArray()
	});
});

exports.addUser = asyncHandler(async function(req, res) {
	if (!req.body.id) {
		res.json({
			code: "003",
			message: "No ID specified"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.id});
	if (user) {
		logError("User '" + req.body.id + "' already exists");
		res.json({
			code: "004",
			message: "User already exists"
		});
		return;
	}

	try {
		await db.collection('users').insertOne({_id: req.body.id});
	} catch (err) {
		logError(err.message);
		res.json({
			code: "001",
			message: "Couldn't add book"
		});
		return;
	}

	logSuccess("User '" + req.body.id + "' successfully added");
	res.json({
		code: "000",
		message: "Success"
	});
});
