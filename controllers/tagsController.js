'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),
		client	= mongo.client();

// Import middleware
const asyncHandler = require('../middleware').asyncHandler;

exports.getTags = asyncHandler(async (req, res) => {
	res.json({tags: await db.collection('tags').find().toArray()});
});

exports.addTag = asyncHandler(async (req, res) => {
	if (!req.body.name) {
		res.json({error: "No name specified"});
		return;
	}
	const tag = await db.collection('tags').findOne({name: req.body.name});

	if (tag) {
		res.json({error: "Tag already exists"});
		return;
	}

	const sortedTags = (await db.collection('tags').find().sort({_id: -1}).toArray())

	try {
		await db.collection('tags').insertOne({
			_id: sortedTags.length ? sortedTags[0]._id + 1: 0,
			name: req.body.name
		});
	} catch (err) {
		if (err) console.log(err.message);
		res.json({error: "Couldn't add book"});
		return;
	}

	res.json({message: "Success"});
});