'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),
		client	= mongo.client();

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
			message: "No Name Specified"
		});
		return;
	}
	const tag = await db.collection('tags').findOne({name: req.body.name});

	if (tag) {
		console.log("Tag '" + req.body.name + "' Already Exists");
		res.json({
			code: "004",
			message: "Tag Already Exists"
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
		console.log(err.message);
		res.json({
			code: "001",
			message: "Couldn't Add Book"
		});
		return;
	}

	console.log("Tag '" + req.body.name + "' Successfully Added");
	res.json({
		code: "000",
		message: "Success"
	});
});