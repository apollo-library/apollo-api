'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),
		client	= mongo.client();

// Import middleware
const asyncHandler = require('../middleware').asyncHandler;

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
			message: "No ID Specified"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.id});
	if (user) {
		console.log("User '" + req.body.id + "' Already Exists");
		res.json({
			code: "004",
			message: "User Already Exists"
		});
		return;
	}

	try {
		await db.collection('users').insertOne({_id: req.body.id});
	} catch (err) {
		console.log(err.message);
		res.json({
			code: "001",
			message: "Couldn't Add Book"
		});
		return;
	}

	console.log("User '" + req.body.id + "' Successfully Added");
	res.json({
		code: "000",
		message: "Success"
	});
});
