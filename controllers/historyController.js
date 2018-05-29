'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Extras
		utils		= require('../utils');

exports.getHistory = utils.asyncHandler(async (req, res) => {
	res.json({function: "getHistory"});
});
