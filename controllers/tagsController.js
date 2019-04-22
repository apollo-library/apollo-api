'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		ObjectId	= require('mongodb').ObjectId,

// Extras
		utils		= require('../utils');

exports.getTags = utils.asyncHandler(async (req, res) => {
	res.json({
		code: "000",
		message: "Success",
		data: await db.collection('tags').find().toArray()
	});
});

exports.addTag = utils.asyncHandler(async (req, res) => {
	if (!req.body.name) {
		res.json({
			code: "003",
			message: "No name specified"
		});
		return;
	}

	if (req.body.colour && isNaN(req.body.colour)) {
		utils.logError("Colour '" + req.body.colour + "' is not a number");
		res.json({
			code: "003",
			message: "Invalid colour"
		});
		return;
	}

	const tag = await db.collection('tags').findOne({name: req.body.name});

	if (tag) {
		utils.logError("Tag '" + req.body.name + "' already exists");
		res.json({
			code: "004",
			message: "Tag already exists"
		});
		return;
	}

	const sortedTags = (await db.collection('tags').find().sort({_id: -1}).toArray())

	try {
		await db.collection('tags').insertOne({
			name: req.body.name,
			colour: Number(req.body.colour) || 0
		});
	} catch (err) {
		utils.logError(err.message);
		res.json({
			code: "001",
			message: "Couldn't add book"
		});
		return;
	}

	utils.logSuccess("Tag '" + req.body.name + "' successfully added");
	res.json({
		code: "000",
		message: "Success"
	});
});
