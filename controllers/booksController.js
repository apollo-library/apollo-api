'use strict';

// Import components
const mongoose = require('mongoose');

// Import models

// Import middleware
const asyncHandler = require('../middleware/asyncHandler');

exports.getBooks = asyncHandler(async function(req, res) {
	res.json({function: "getBooks"});
});

exports.addBook = asyncHandler(async function(req, res) {
	res.json({function: "addBook", body: req.body});
});
