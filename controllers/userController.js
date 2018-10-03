'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Extras
		utils		= require('../utils');

exports.getUser = utils.asyncHandler(async (req, res) => {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "003",
			message: "User not found"
		});
		return;
	}

	utils.logSuccess("User '" + req.params.userID + "' found");
	res.json({
		code: "000",
		message: "Success",
		data: user
	});
});

exports.deleteUser = utils.asyncHandler(async (req, res) => {
	const user = await db.collection('users').findOne({_id: req.params.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "002",
			message: "User not found"
		});
		return;
	}

	try {
		await db.collection('users').remove({_id: user._id});
	} catch (err) {
		utils.logError(err);
		res.json({
			code: "001",
			message: "Couldn't delete user"
		});
		return;
	}

	utils.logSuccess("User '" + req.params.userID + "' successfully deleted");
	res.json({
		code: "000",
		message: "Success"
	});
});

exports.getHistory = utils.asyncHandler(async (req, res) => {
	res.json({
		code: "000",
		message: "Success",
		data: (await db.collection('history').find().toArray())
			.filter(item => item.user == req.params.userID)
	});
});
