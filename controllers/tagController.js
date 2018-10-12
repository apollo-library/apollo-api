'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Extras
		utils		= require('../utils');

exports.getTag = utils.asyncHandler(async (req, res) => {
	if (isNaN(req.params.tagID)) {
		res.json({
			code: "003",
			message: "Invalid tag ID"
		});
		return;
	}

	const tag = await db.collection('tags').findOne({_id: Number(req.params.tagID)});
	if (!tag) {
		utils.logError("Tag ID '" + req.params.tagID + "' not found");
		res.json({
			code: "002",
			message: "Tag not found"
		});
		return;
	}

	utils.logSuccess("Tag ID '" + req.params.tagID + "' found");
	res.json({
		code: "000",
		message: "Success",
		data: tag
	});
})

exports.editTag = utils.asyncHandler(async (req, res) => {
	if (isNaN(req.params.tagID)) {
		res.json({
			code: "003",
			message: "Invalid tag ID"
		});
		return;
	}

	const tag = await db.collection('tags').findOne({_id: Number(req.params.tagID)});
	if (!tag) {
		utils.logError("Tag ID '" + req.params.tagID + "' not found");
		res.json({
			code: "004",
			message: "Tag not found"
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

	try {
		await db.collection('tags').updateOne({_id: tag._id}, {$set: {
			name: req.body.name ? req.body.name : tag.name,
			colour: req.body.colour ? Number(req.body.colour) : tag.colour
		}});
	} catch (err) {
		utils.logError(err);
		res.json({
			code: "001",
			message: "Couldn't edit tag"
		});
		return;
	}

	utils.logSuccess("Tag '" + req.params.tagID + "' successfully edited");
	res.json({
		code: "000",
		message: "Success"
	});
});