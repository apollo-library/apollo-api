'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),

// Extras
		utils	= require('../utils');

// Get all history
exports.getHistory = utils.asyncHandler(async (req, res) => {
	res.json({
		code: "000",
		message: "Success",
		data: await db.collection('history').find().toArray()
	});
});
