'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),
		client	= mongo.client(),
		config	= require('../config');

// Import middleware
const asyncHandler = require('../middleware').asyncHandler;

// Book info

exports.getBook = asyncHandler(async function(req, res) {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		console.log("Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Book Not Found"
		});
		return;
	}

	console.log("Book '" + req.params.bookID + "' Found");
	res.json({
		code: "000",
		message: "Book Found",
		data: book
	});
});

exports.editBook = asyncHandler(async function(req, res) {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		console.log("Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Book Not Found"
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
		console.log(err);
		res.json({
			code: "001",
			message: "Couldn't Edit Book"
		});
		return;
	}

	console.log("Book '" + book.title + "' Successfully Edited");
	res.json({
		code: "000",
		message: "Success"
	});
});

exports.deleteBook = asyncHandler(async function(req, res) {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		console.log("Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Book Not Found"
		});
		return;
	}

	try {
		await db.collection('books').remove({_id: book._id});
	} catch (err) {
		console.log(err);
		res.json({
			code: "001",
			message: "Couldn't Delete Book"
		});
		return;
	}

	console.log("Book '" + req.params.bookID + "' Successfully Deleted");
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
			message: "No User ID Specified"
		});
		return;
	}

	if (!req.body.due) {
		res.json({
			code: "003",
			message: "No Due Date Specified"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		console.log("User '" + req.body.userID + "' Not Found");
		res.json({
			code: "002",
			message: "User Not Found"
		});
		return;
	}

	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		console.log("Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Book Not Found"
		});
		return;
	}

	if (book.loanID) {
		console.log("Book '" + req.params.bookID + "' Already On Loan");
		res.json({
			code: "004",
			message: "Book Already On Loan"
		});
		return;
	}

	const reservation = book.reservationID ? await db.collection('reservations').findOne({_id: book.reservationID}) : null;

	if (reservation && reservation.userID != user._id) {
		console.log("Book '" + req.params.bookID + "' Reserved");
		res.json({
			code: "004",
			message: "Book Reserved"
		});
		return;
	}

	client.withSession(async session => {
		session.startTransaction();

		try {
			const loanID = (await db.collection('loans').insertOne({
				userID: user._id,
				bookID: book._id,
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
			console.log(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't Withdraw Book"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		console.log("Book '" + req.params.bookID + "' Successfully Withdrawn");
		res.json({
			code: "000",
			message: "Success"
		})
	});
});

exports.depositBook = asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		console.log("Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Book Not Found"
		});
		return;
	}
	if (!book.loanID) {
		console.log("Book '" + req.params.bookID + "' Not On Loan");
		res.json({
			code: "004",
			message: "Book Not On Loan"
		});
		return;
	}

	const loan = await db.collection('loans').findOne({_id: book.loanID});
	if (!loan) {
		console.log("Loan For Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Loan Not Found"
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
			console.log(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't Deposit Book"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		console.log("Book '" + req.params.bookID + "' Successfully Deposited");
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
			message: "No User ID Specified"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		console.log("User '" + req.body.userID + "' Not Found");
		res.json({
			code: "002",
			message: "User Not Found"
		});
		return;
	}

	if (user.reservationIDs && user.reservationIDs.length >= config.reservationLimit) {
		console.log("User '" + req.body.userID + "' At Reservation Limit");
		res.json({
			code: "004",
			message: "Too Many Books Already Reserved"
		});
		return;
	}

	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		console.log("Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Book Not Found"
		});
		return;
	}

	if (book.reservationID) {
		console.log("Book '" + req.params.bookID + "' Already Reserved");
		res.json({
			code: "004",
			message: "Book Already Reserved"
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
			console.log(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't Reserve Book"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		console.log("Book '" + req.params.bookID + "' Successfully Reserved");
		res.json({
			code: "000",
			message: "Success"
		})
	});
});

exports.getReservation = asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		console.log("Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Book Not Found"
		});
		return;
	}
	if (!book.reservationID) {
		console.log("Book '" + req.params.bookID + "' Not Reserved");
		res.json({
			code: "004",
			message: "Book Not Reserved"
		});
		return;
	}

	const reservation = await db.collection('reservations').findOne({_id: book.reservationID});
	if (!reservation) {
		console.log("Reservation For Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Reservation Not Found"
		});
		return;
	}

	console.log("Book '" + req.params.bookID + "' Successfully Reserved");
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
			message: "No User ID Specified"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		console.log("User '" + req.params.userID + "' Not Found");
		res.json({
			code: "002",
			message: "User Not Found"
		});
		return;
	}

	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		console.log("Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Book Not Found"
		});
		return;
	}
	if (!book.reservationID) {
		console.log("Book '" + req.params.bookID + "' Not Reserved");
		res.json({
			code: "004",
			message: "Book Not Reserved"
		});
		return;
	}

	const reservation = await db.collection('reservations').findOne({_id: book.reservationID});
	if (!reservation) {
		console.log("Reservation For Book '" + req.params.bookID + "' Not Reserved");
		res.json({
			code: "002",
			message: "Reservation Not Found"
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
			console.log(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't Remove Reservation"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		console.log("Reservation For Book '" + req.params.bookID + "' Successfully Deleted");
		res.json({
			code: "000",
			message: "Success"
		})
	});
});

exports.renewBook = asyncHandler(async (req, res) => {
    if (!req.body.userID) {
		res.json({
			code: "003",
			message: "No User ID Specified"
		});
		return;
	}
	
	if (!req.body.due) {
		res.json({
			code: "003",
			message: "No Due Date Specified"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		console.log("User '" + req.params.userID + "' Not Found");
		res.json({
			code: "002",
			message: "User Not Found"
		});
		return;
	}

	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		res.json({
			code: "002",
			message: "Book Not Found"
		});
		return;
	}

	if (!book.loanID) {
		console.log("Book '" + req.params.bookID + "' Not Found");
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
		console.log(err);
		res.json({
			code: "001",
			message: "Couldn't renew book"
		});
		return;
	}

	console.log("Book '" + req.params.bookID + "' Successfully Renewed");
	res.json({
		code: "000",
		message: "Success"
	});
});

// Loans information
exports.getCurrentLoan = asyncHandler(async function(req, res) {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		console.log("Book '" + req.params.bookID + "' Not Found");
		res.json({
			code: "002",
			message: "Book Not Found"
		});
		return;
	}

	if (!book.loanID) {
		console.log("Book '" + req.params.bookID + "' Not On Loan");
		res.json({
			code: "004",
			message: "Book Not On Loan"
		});
		return;
	}

	const loan = await db.collection('loans').findOne({_id: book.loanID});

	console.log("Loan For Book '" + req.params.bookID + "' Found");
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
