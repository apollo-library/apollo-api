'use strict';

// Import components
const mongoose = require('mongoose');

// Import models

// Import middleware
const asyncHandler = require('../middleware/asyncHandler');

exports.getHistory = asyncHandler(async function(req, res) {
	res.json({function: "getHistory"});
});
