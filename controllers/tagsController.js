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

exports.getTags = asyncHandler(async (req, res) => {
	res.json({
		code: "000",
		message: "Success",
		data: await db.collection('tags').find().toArray()
	});
});

exports.addTag = asyncHandler(async (req, res) => {
	if (!req.body.name) {
		res.json({
			code: "003",
			message: "No name specified"
		});
		return;
	}
	const tag = await db.collection('tags').findOne({name: req.body.name});

	if (tag) {
		logError("Tag '" + req.body.name + "' already exists");
		res.json({
			code: "004",
			message: "Tag already exists"
		});
		return;
	}

	const sortedTags = (await db.collection('tags').find().sort({_id: -1}).toArray())

	try {
		await db.collection('tags').insertOne({
			_id: sortedTags.length ? sortedTags[0]._id + 1: 0,
			name: req.body.name
		});
	} catch (err) {
		logError(err.message);
		res.json({
			code: "001",
			message: "Couldn't add book"
		});
		return;
	}

	logSuccess("Tag '" + req.body.name + "' successfully added");
	res.json({
		code: "000",
		message: "Success"
	});
});