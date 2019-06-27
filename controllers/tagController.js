'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),
		ObjectId	= require('mongodb').ObjectId,

// Extras
		utils	= require('../utils');

// Get info for a tag
exports.getTag = utils.asyncHandler(async (req, res) => {
	const tag = await db.collection('tags').findOne({_id: ObjectId(req.params.tagID)}); // Find tag in database
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

// Edit tag info
exports.editTag = utils.asyncHandler(async (req, res) => {
	const tag = await db.collection('tags').findOne({_id: ObjectId(req.params.tagID)}); // Find tag in database
	if (!tag) {
		utils.logError("Tag ID '" + req.params.tagID + "' not found");
		res.json({
			code: "004",
			message: "Tag not found"
		});
		return;
	}

	// Update tag name
	try {
		await db.collection('tags').updateOne({_id: tag._id}, {$set: {
			name: req.body.name ? req.body.name : tag.name
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

// Delete tag from database
exports.deleteTag = utils.asyncHandler(async (req, res) => {
	const tag = await db.collection('tags').findOne({_id: ObjectId(req.params.tagID)}); // Find tag in database
	if (!tag) {
		utils.logError("Tag ID '" + req.params.tagID + "' not found");
		res.json({
			code: "004",
			message: "Tag not found"
		});
		return;
	}

	// Delete tag and update relevant books in database
	client.withSession(async session => { // This uses MongoDB 4's new multi-transaction features
		session.startTransaction();

		try {
			await db.collection('tags').deleteOne({_id: tag._id}, {session});
			await db.collection('books').updateMany({tags: req.params.tagID}, {$pull: {
				tags: req.params.tagID
			}}, {session});
		} catch (err) {
			utils.logError(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't delete tag"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		utils.logSuccess("Tag '" + req.params.bookID + "' successfully deleted");
		res.json({
			code: "000",
			message: "Success"
		});
	});
});