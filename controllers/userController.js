'use strict';

// Import components
const mongoose = require('mongoose');

// Import models

// Import middleware
const asyncHandler = require('../middleware/asyncHandler');

exports.getUser = asyncHandler(async function(req, res) {
	res.json({function: "getUser", userID: req.params.userID});
});

exports.editUser = asyncHandler(async function(req, res) {
	res.json({function: "editUser", userID: req.params.userID, body: req.body});
});

exports.deleteUser = asyncHandler(async function(req, res) {
	res.json({function: "deleteUser", userID: req.params.userID});
});

exports.getHistory = asyncHandler(async function(req, res) {
	res.json({function: "getHistory", userID: req.params.userID});
});

exports.getHistoryLoans = asyncHandler(async function(req, res) {
	res.json({function: "getHistoryLoans", userID: req.params.userID});
});

exports.getHistoryFines = asyncHandler(async function(req, res) {
	res.json({function: "getHistoryFines", userID: req.params.userID});
});
