'use strict';

// Mongo Setup
const	mongodb				= require('mongodb'),
		MongoClient			= mongodb.MongoClient,
		MongoNetworkError	= mongodb.MongoNetworkError;

// Import models

// Import middleware
const asyncHandler = require('../middleware/asyncHandler');

exports.getBooks = asyncHandler(async function(req, res) {
	res.json({function: "getBooks"});
});

exports.addBook = asyncHandler(async function(req, res) {
	res.json({function: "addBook", body: req.body});
});
