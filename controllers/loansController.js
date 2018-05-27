'use strict';

// Mongo Setup
const	mongodb				= require('mongodb'),
		MongoClient			= mongodb.MongoClient,
		MongoNetworkError	= mongodb.MongoNetworkError;

// Import middleware
const asyncHandler = require('../middleware/asyncHandler');

exports.getLoans = asyncHandler(async function(req, res) {
	res.json({function: "getLoans"});
});

exports.getOverdueLoans = asyncHandler(async function(req, res) {
	res.json({function: "getOverdueLoans"});
});
