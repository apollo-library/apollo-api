'use strict';

// Import components
const mongoose = require('mongoose');

// Import models

// Import middleware
const asyncHandler = require('../middleware/asyncHandler');

// Book info

exports.getBook = asyncHandler(async function(req, res) {
	res.json({function: "getBook", bookID: req.params.bookID});
});

exports.editBook = asyncHandler(async function(req, res) {
	res.json({function: "editBook", bookID: req.params.bookID, body: req.body});
});

exports.deleteBook = asyncHandler(async function(req, res) {
	res.json({function: "deleteBook", bookID: req.params.bookID});
});

// Book loaning and management

exports.withdrawBook = asyncHandler(async function(req, res) {
	res.json({function: "withdrawBook", bookID: req.params.bookID, body: req.body});
});

exports.depositBook = asyncHandler(async function(req, res) {
	res.json({function: "depositBook", bookID: req.params.bookID});
});

exports.reserveBook = asyncHandler(async function(req, res) {
	res.json({function: "reserveBook", bookID: req.params.bookID});
});

exports.getReservation = asyncHandler(async function(req, res) {
	res.json({function: "getReservation", bookID: req.params.bookID});
});

exports.deleteReservation = asyncHandler(async function(req, res) {
	res.json({function: "deleteReservation", bookID: req.params.bookID});
});

exports.renewBook = asyncHandler(async function(req, res) {
    res.json({function: "renewBook", bookID: req.params.bookID});
});

// Loans information
exports.getCurrentLoan = asyncHandler(async function(req, res) {
    res.json({function: "getCurrentLoan", bookID: req.params.bookID});
});

// History

exports.getBookHistory = asyncHandler(async function(req, res) {
	res.json({function: "getBookHistory", bookID: req.params.bookID});
});

exports.getBookHistoryUsers = asyncHandler(async function(req, res) {
	res.json({function: "getBookHistoryUsers", bookID: req.params.bookID});
});
