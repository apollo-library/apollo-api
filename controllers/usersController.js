'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),
		client	= mongo.client();

// Import middleware
const asyncHandler = require('../middleware').asyncHandler;

exports.getUsers = asyncHandler(async function(req, res) {
	res.json({users: await db.collection('users').find().toArray()});
});

exports.addUser = asyncHandler(async function(req, res) {
	if (!req.body.id) {
		res.json({error: "No ID specified"});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.id});
	if (user) {
		res.json({error: "User already exists"});
		return;
	}

	try {
		await db.collection('users').insertOne({_id: req.body.id});
	} catch (err) {
		console.log(err.message);
		res.json({error: "Couldn't add book"});
		return;
	}

	res.json({message: "Success"});
});
