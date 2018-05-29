'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Import middleware
		asyncHandler = require('../middleware').asyncHandler,

// Extras
		config		= require('../config'),
		utils		= require('../utils'),
		logError	= utils.logError,
		logSuccess	= utils.logSuccess;

function validDate(dateString) {
	console.log("Checking date '" + dateString + "'");

	// yyyy-mm-dd
	if (!/^\d{4}([./-])\d{2}\1\d{2}$/.test(dateString)) {
		logError("Date is not yyyy-mm-dd");
		return false;
	}
	console.log("...Date is yyyy-mm-dd");

	const newDate = new Date(dateString);
	if (isNaN(newDate)) {
		logError("Date does not convert to valid object");
		return false;
	}
	console.log("...Date converted to valid object");

	var now = new Date();
	now.setHours(0,0,0,0);
	if (newDate > now) {
		console.log("...Date is in future");
		logSuccess("Date is vaild")
		return true;
	} else {
		logError("Date is not in future");
		return false;
	}
};

// Book info

exports.getBook = asyncHandler(async function(req, res) {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	logSuccess("Book '" + req.params.bookID + "' found");
	res.json({
		code: "000",
		message: "Book found",
		data: book
	});
});

exports.editBook = asyncHandler(async function(req, res) {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	try {
		await db.collection('books').updateOne({_id: book._id}, {$set: {
			title: req.body.title || book.title,
			author: req.body.author || book.author,
			tags: req.body.tags || book.tags
		}});
	} catch (err) {
		logError(err);
		res.json({
			code: "001",
			message: "Couldn't edit book"
		});
		return;
	}

	logSuccess("Book '" + book.title + "' successfully edited");
	res.json({
		code: "000",
		message: "Success"
	});
});

exports.deleteBook = asyncHandler(async function(req, res) {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	try {
		await db.collection('books').remove({_id: book._id});
	} catch (err) {
		logError(err);
		res.json({
			code: "001",
			message: "Couldn't delete book"
		});
		return;
	}

	logSuccess("Book '" + req.params.bookID + "' successfully deleted");
	res.json({
		code: "000",
		message: "Success"
	});
});

// Book loaning and management

exports.withdrawBook = asyncHandler(async (req, res) => {
	if (!req.body.userID) {
		res.json({
			code: "003",
			message: "No user ID specified"
		});
		return;
	}

	if (!req.body.due) {
		res.json({
			code: "003",
			message: "No due date specified"
		});
		return;
	}

	if (!validDate(req.body.due)) {
		res.json({
			code: "003",
			message: "Date not a valid format"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		logError("User '" + req.body.userID + "' not found");
		res.json({
			code: "002",
			message: "User not found"
		});
		return;
	}

	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	if (book.loanID) {
		logError("Book '" + req.params.bookID + "' already on loan");
		res.json({
			code: "004",
			message: "Book already on loan"
		});
		return;
	}

	const reservation = book.reservationID ? await db.collection('reservations').findOne({_id: book.reservationID}) : null;

	if (reservation && reservation.userID != user._id) {
		logError("Book '" + req.params.bookID + "' reserved");
		res.json({
			code: "004",
			message: "Book reserved"
		});
		return;
	}

	client.withSession(async session => {
		session.startTransaction();

		try {
			const loanID = (await db.collection('loans').insertOne({
				userID: user._id,
				bookID: book._id,
				withdrawDate: new Date(),
				dueDate: new Date(req.body.due)
			}, {session})).ops[0]._id;

			await db.collection('users').updateOne({_id: req.body.userID}, {$push: {
				loanIDs: loanID
			}, $pull: {
				reservationIDs: book.reservationID
			}}, {session});

			await db.collection('books').updateOne({_id: req.params.bookID}, {$set: {
				loanID: loanID
			}, $unset : {
				reservationID: null
			}}, {session});

			await db.collection('reservations').remove({_id: book.reservationID})
		} catch (err) {
			logError(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't withdraw book"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		logSuccess("Book '" + req.params.bookID + "' successfully withdrawn");
		res.json({
			code: "000",
			message: "Success"
		})
	});
});

exports.depositBook = asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}
	if (!book.loanID) {
		logError("Book '" + req.params.bookID + "' not on loan");
		res.json({
			code: "004",
			message: "Book not on loan"
		});
		return;
	}

	const loan = await db.collection('loans').findOne({_id: book.loanID});
	if (!loan) {
		logError("Loan for book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Loan not found"
		});
		return;
	}

	client.withSession(async session => {
		session.startTransaction();

		try {
			await db.collection('loans').updateOne({_id: loan._id}, {$set: {
				returnDate: new Date()
			}}, {session});

			await db.collection('users').updateOne({_id: loan.userID}, {$pull: {
				loanIDs: loan._id
			}}, {session});

			await db.collection('books').updateOne({_id: loan.bookID}, {$unset: {
				loanID: null
			}}, {session});
		} catch (err) {
			logError(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't deposit book"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		logSuccess("Book '" + req.params.bookID + "' successfully deposited");
		res.json({
			code: "000",
			message: "Success"
		})
	});
});

exports.reserveBook = asyncHandler(async (req, res) => {
	if (!req.body.userID) {
		res.json({
			code: "003",
			message: "No user ID specified"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		logError("User '" + req.body.userID + "' not found");
		res.json({
			code: "002",
			message: "User not found"
		});
		return;
	}

	if (user.reservationIDs && user.reservationIDs.length >= config.reservationLimit) {
		logError("User '" + req.body.userID + "' at reservation limit");
		res.json({
			code: "004",
			message: "Too many books already reserved"
		});
		return;
	}

	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	if (book.reservationID) {
		logError("Book '" + req.params.bookID + "' already reserved");
		res.json({
			code: "004",
			message: "Book already reserved"
		});
		return;
	}

	client.withSession(async session => {
		session.startTransaction();

		try {
			const reservationID = (await db.collection('reservations').insertOne({
				userID: user._id,
				bookID: book._id
			}, {session})).ops[0]._id;

			await db.collection('users').updateOne({_id: req.body.userID}, {$push: {
				reservationIDs: reservationID
			}}, {session});

			await db.collection('books').updateOne({_id: req.params.bookID}, {$set: {
				reservationID: reservationID
			}}, {session});
		} catch (err) {
			logError(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't reserve book"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		logSuccess("Book '" + req.params.bookID + "' successfully reserved");
		res.json({
			code: "000",
			message: "Success"
		})
	});
});

exports.getReservation = asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}
	if (!book.reservationID) {
		logError("Book '" + req.params.bookID + "' not reserved");
		res.json({
			code: "004",
			message: "Book not reserved"
		});
		return;
	}

	const reservation = await db.collection('reservations').findOne({_id: book.reservationID});
	if (!reservation) {
		logError("Reservation for book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Reservation not found"
		});
		return;
	}

	logSuccess("Book '" + req.params.bookID + "' successfully reserved");
	res.json({
		code: "000",
		message: "Success",
		reservation: reservation
	});
});

exports.deleteReservation = asyncHandler(async (req, res) => {
	if (!req.body.userID) {
		res.json({
			code: "003",
			message: "No user ID specified"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "002",
			message: "User not found"
		});
		return;
	}

	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}
	if (!book.reservationID) {
		logError("Book '" + req.params.bookID + "' not reserved");
		res.json({
			code: "004",
			message: "Book not reserved"
		});
		return;
	}

	const reservation = await db.collection('reservations').findOne({_id: book.reservationID});
	if (!reservation) {
		logError("Reservation for book '" + req.params.bookID + "' not reserved");
		res.json({
			code: "002",
			message: "Reservation not found"
		});
		return;
	}

	client.withSession(async session => {
		session.startTransaction();

		try {
			await db.collection('reservations').remove({_id: reservation._id}, {session});

			await db.collection('users').updateOne({_id: user._id}, {$pull: {
				reservationIDs: reservation._id
			}}, {session});

			await db.collection('books').updateOne({_id: book._id}, {$unset: {
				reservationID: null
			}}, {session});
		} catch (err) {
			logError(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't remove reservation"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		logSuccess("Reservation for book '" + req.params.bookID + "' successfully deleted");
		res.json({
			code: "000",
			message: "Success"
		})
	});
});

exports.renewBook = asyncHandler(async (req, res) => {
	if (!req.body.due) {
		res.json({
			code: "003",
			message: "No due date specified"
		});
		return;
	}

	if (!validDate(req.body.due)) {
		res.json({
			code: "003",
			message: "Date not a valid format"
		});
		return;
	}

	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	if (!book.loanID) {
		logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "004",
			message: "Book not on loan"
		});
		return;
	}

	try {
		await db.collection('loans').updateOne({_id: book.loanID}, {$set: {
			dueDate: new Date(req.body.due)
		}});
	} catch (err) {
		logError(err);
		res.json({
			code: "001",
			message: "Couldn't renew book"
		});
		return;
	}

	logSuccess("Book '" + req.params.bookID + "' successfully renewed");
	res.json({
		code: "000",
		message: "Success"
	});
});

// Loans information
exports.getCurrentLoan = asyncHandler(async function(req, res) {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	if (!book.loanID) {
		logError("Book '" + req.params.bookID + "' not on loan");
		res.json({
			code: "004",
			message: "Book not on loan"
		});
		return;
	}

	const loan = await db.collection('loans').findOne({_id: book.loanID});

	logSuccess("Loan for book '" + req.params.bookID + "' found");
	res.json({
		code: "000",
		message: "Success",
		data: loan
	});
});

// History

exports.getBookHistory = asyncHandler(async function(req, res) {
	res.json({function: "getBookHistory", bookID: req.params.bookID});
});

exports.getBookHistoryUsers = asyncHandler(async function(req, res) {
	res.json({function: "getBookHistoryUsers", bookID: req.params.bookID});
});
