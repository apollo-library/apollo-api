'use strict';

// Import components
const mongoose = require('mongoose');

// Import models

// Import middleware
const asyncHandler = require('../middleware/asyncHandler');

exports.getLoans = asyncHandler(async function(req, res) {
	res.json({function: "getLoans"});
});

exports.getOverdueLoans = asyncHandler(async function(req, res) {
	res.json({function: "getOverdueLoans"});
});
