'use strict';

// Mongo Setup
const	mongo	=		require('../mongo'),
		db		=		mongo.db(),
		client	=		mongo.client();

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
	if (!req.body.userID) {
		res.json({error: "No user ID specified"});
		return;
	}

	const user = await db.collection('users').findOne({id: req.body.userID});
	if (!user) {
		res.json({error: "User doesn't exist"});
		return;
	}

	const book = await db.collection('books').findOne({id: req.params.bookID});
	if (!book) {
		res.json({error: "Book doesn't exist"});
		return;
	}
	if (book.loan) {
		res.json({error: "Book already on loan"});
		return;
	}

	client.withSession(async session => {
		session.startTransaction();

		try {
			await db.collection('books').updateOne({id: req.params.bookID}, {$set: {
				loan: {
					userID: req.body.userID
					// Add a full object here
				}
			}}, {session});
			await db.collection('users').updateOne({id: req.body.userID}, {$push: {
				loans: {
					bookID: req.params.bookID
					// Add a full object here
				}
			}}, {session});
		} catch (err) {
			if (err) console.log(err.message);
			session.abortTransaction();
			res.json({error: "Couldn't withdraw book"});
			return;
		}

		await session.commitTransaction();
	}).then(() => res.json({message: "success"}));
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
