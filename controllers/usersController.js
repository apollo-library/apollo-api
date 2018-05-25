'use strict';

// Mongo Setup
const	mongodb				= require('mongodb'),
		MongoClient			= mongodb.MongoClient,
		MongoNetworkError	= mongodb.MongoNetworkError;

// Import models

// Import middleware
const asyncHandler = require('../middleware/asyncHandler');

exports.getUsers = asyncHandler(async function(req, res) {
	res.json({function: "getUsers"});
});

exports.addUser = asyncHandler(async function(req, res) {
	res.json({function: "addUser", body: req.body});
});
