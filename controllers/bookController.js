'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),
		client	= mongo.client(),

// Extras
		config	= require('../config'),
		utils	= require('../utils');

// Book info

// Get info for a specific book
exports.getBook = utils.asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID}); // Find book in database

	if (!book) { // Book not found in database
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	utils.logSuccess("Book '" + req.params.bookID + "' found");
	res.json({
		code: "000",
		message: "Success",
		data: book
	});
});

// Edit details for a specific book
exports.editBook = utils.asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID}); // Find book in database
	
	if (!book) { // Book not found in database
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	// This fixes a problem with url encoded data
	// emptyTags is set to an empty array if no tags are in the tags data, otherwise the correct tags are added and linked in the database

	let emptyTags;
	if (req.body.tags && req.body.tags[0] === "") emptyTags = [];

	const tags = req.body.tags ? await db.collection('tags').find().sort({_id: -1}).toArray() : []; // List of all tags in database if tags are specified in the body, otherwise empty array
	const tagIDs = tags.map(t => t._id.toString()); // Array of tag IDs for all tags from database
	const newTags = req.body.tags ? req.body.tags.filter(tag => !tagIDs.includes(tag)): []; // List of all tags that aren't in the database

	// If tags are sent which aren't in the database, return error
	if (newTags.length && !emptyTags) {
		utils.logError("Tag " + (newTags.length > 1 ? "IDs" : "ID") + " '" + newTags.join("', '") + "' not found");
		res.json({
			code: "004",
			message: "Tag not found"
		});
		return;
	}

	// Upload updated object to database
	try {
		await db.collection('books').updateOne({_id: book._id}, {$set: {
			ISBN10:		req.body.ISBN10		|| book.ISBN10,
			ISBN13:		req.body.ISBN13		|| book.ISBN13,
			title:		req.body.title		|| book.title,
			author:		req.body.author		|| book.author,
			publisher:	req.body.publisher	|| book.publisher,
			tags:		emptyTags 			|| req.body.tags	|| book.tags,
			deleted: 	false
		}});
	} catch (err) {
		utils.logError(err);
		res.json({
			code: "001",
			message: "Couldn't edit book"
		});
		return;
	}

	utils.logSuccess("Book '" + book.title + "' successfully edited");
	res.json({
		code: "000",
		message: "Success"
	});
});

// Delete book
// Note: this doesn't actually delete the entry, rather sets a 'deleted' attribute to true and clears any identifying data from it
//       this stops any loan history from breaking by keeping the reference
exports.deleteBook = utils.asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	try {
		await db.collection('books').findOneAndUpdate({_id: book._id}, {
			$set: {
				title:		"Deleted", // Setting this allows it to be displayed by the frontend
				deleted:	true
			},
			$unset: { // Clear identifying data
				ISBN10:		null,
				ISBN13:		null,
				author:		null,
				publisher:	null,
				tags: 		null
			}
		});
	} catch (err) {
		utils.logError(err);
		res.json({
			code: "001",
			message: "Couldn't delete book"
		});
		return;
	}

	utils.logSuccess("Book '" + req.params.bookID + "' successfully deleted");
	res.json({
		code: "000",
		message: "Success"
	});
});

// Book loaning and management

// Withdraw book
exports.withdrawBook = utils.asyncHandler(async (req, res) => {
	// Check all parameters are specified and return an error if not
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

	if (!utils.validDate(req.body.due)) {
		res.json({
			code: "003",
			message: "Date not a valid format"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		utils.logError("User '" + req.body.userID + "' not found");
		res.json({
			code: "002",
			message: "User not found"
		});
		return;
	}

	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	if (book.loanID) {
		utils.logError("Book '" + req.params.bookID + "' already on loan");
		res.json({
			code: "004",
			message: "Book already on loan"
		});
		return;
	}

	// Check if book has a current reservation
	const reservation = book.reservationID ? await db.collection('reservations').findOne({_id: book.reservationID}) : null;

	if (reservation && reservation.userID != user._id) {
		utils.logError("Book '" + req.params.bookID + "' reserved");
		res.json({
			code: "004",
			message: "Book reserved"
		});
		return;
	}

	// Add loan data in all places
	client.withSession(async session => {
		session.startTransaction();

		try {
			const withdrawID = (await db.collection('history').insertOne({
				date: new Date(),
				action: "withdraw",
				user: user._id,
				book: book._id
			}, {session})).ops[0]._id;

			const loanID = (await db.collection('loans').insertOne({
				dueDate: new Date(req.body.due),
				withdrawID: withdrawID
			}, {session})).ops[0]._id;

			await db.collection('users').updateOne({_id: user._id}, {$push: {
				loanIDs: loanID
			}, $pull: {
				reservationIDs: book.reservationID
			}}, {session});

			await db.collection('books').updateOne({_id: book._id}, {$set: {
				loanID: loanID
			}, $unset : {
				reservationID: null
			}}, {session});

			await db.collection('reservations').deleteOne({_id: book.reservationID});
		} catch (err) {
			utils.logError(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't withdraw book"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		utils.logSuccess("Book '" + req.params.bookID + "' successfully withdrawn");
		res.json({
			code: "000",
			message: "Success"
		});
	});
});

// Deposit book
exports.depositBook = utils.asyncHandler(async (req, res) => {
	// Check that book exists in database
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}
	if (!book.loanID) {
		utils.logError("Book '" + req.params.bookID + "' not on loan");
		res.json({
			code: "004",
			message: "Book not on loan"
		});
		return;
	}

	const loan = await db.collection('loans').findOne({_id: book.loanID});
	if (!loan) {
		utils.logError("Loan for book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Loan not found"
		});
		return;
	}

	// Update all appropriate objects in database
	client.withSession(async session => {
		session.startTransaction();

		try {
			const withdrawal = await db.collection('history').findOne({_id: loan.withdrawID}, {session});

			await db.collection('loans').updateOne({_id: loan._id}, {$set: {
				returnDate: new Date()
			}}, {session});

			await db.collection('users').updateOne({_id: withdrawal.user}, {$pull: {
				loanIDs: loan._id
			}}, {session});

			await db.collection('books').updateOne({_id: withdrawal.book}, {$unset: {
				loanID: null
			}}, {session});

			await db.collection('history').insertOne({
				date: new Date(),
				action: "deposit",
				user: withdrawal.user,
				book: withdrawal.book
			}, {session});
		} catch (err) {
			utils.logError(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't deposit book"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		utils.logSuccess("Book '" + req.params.bookID + "' successfully deposited");
		res.json({
			code: "000",
			message: "Success"
		})
	});
});

// Reserve book
exports.reserveBook = utils.asyncHandler(async (req, res) => {
	// Check all data is provided
	if (!req.body.userID) {
		res.json({
			code: "003",
			message: "No user ID specified"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		utils.logError("User '" + req.body.userID + "' not found");
		res.json({
			code: "002",
			message: "User not found"
		});
		return;
	}

	if (user.reservationIDs && user.reservationIDs.length >= config.reservationLimit) {
		utils.logError("User '" + req.body.userID + "' at reservation limit");
		res.json({
			code: "004",
			message: "Too many books already reserved"
		});
		return;
	}

	// Check book exists
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	// If the book is reserved, return an error
	if (book.reservationID) {
		utils.logError("Book '" + req.params.bookID + "' already reserved");
		res.json({
			code: "004",
			message: "Book already reserved"
		});
		return;
	}

	// Add and link reservation object
	client.withSession(async session => {
		session.startTransaction();

		try {
			const reservationID = (await db.collection('reservations').insertOne({
				userID: user._id,
				bookID: book._id
			}, {session})).ops[0]._id;

			await db.collection('users').updateOne({_id: user._id}, {$push: {
				reservationIDs: reservationID
			}}, {session});

			await db.collection('books').updateOne({_id: book._id}, {$set: {
				reservationID: reservationID
			}}, {session});

			await db.collection('history').insertOne({
				date: new Date(),
				action: "reserve",
				user: user._id,
				book: book._id
			}, {session});
		} catch (err) {
			utils.logError(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't reserve book"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		utils.logSuccess("Book '" + req.params.bookID + "' successfully reserved");
		res.json({
			code: "000",
			message: "Success"
		})
	});
});

// Get reservation info
exports.getReservation = utils.asyncHandler(async (req, res) => {
	// Check book exists in database
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	// Check if book is currently reserved
	if (!book.reservationID) {
		utils.logError("Book '" + req.params.bookID + "' not reserved");
		res.json({
			code: "004",
			message: "Book not reserved"
		});
		return;
	}

	// Check if reservation is in database
	const reservation = await db.collection('reservations').findOne({_id: book.reservationID});
	if (!reservation) {
		utils.logError("Reservation for book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Reservation not found"
		});
		return;
	}

	utils.logSuccess("Book '" + req.params.bookID + "' successfully reserved");
	res.json({
		code: "000",
		message: "Success",
		reservation: reservation
	});
});

// Delete reservation
exports.deleteReservation = utils.asyncHandler(async (req, res) => {
	// Check if userID is sent
	if (!req.body.userID) {
		res.json({
			code: "003",
			message: "No user ID specified"
		});
		return;
	}

	// Check if user is in the database
	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
		res.json({
			code: "002",
			message: "User not found"
		});
		return;
	}

	// Check if book is in the database
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	// Check that the book is currently reserved
	if (!book.reservationID) {
		utils.logError("Book '" + req.params.bookID + "' not reserved");
		res.json({
			code: "004",
			message: "Book not reserved"
		});
		return;
	}

	// Check for reservation in the database
	const reservation = await db.collection('reservations').findOne({_id: book.reservationID});
	if (!reservation) {
		utils.logError("Reservation for book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Reservation not found"
		});
		return;
	}

	// Update all objects in the database
	client.withSession(async session => {
		session.startTransaction();

		try {
			await db.collection('reservations').deleteOne({_id: reservation._id}, {session});

			await db.collection('users').updateOne({_id: user._id}, {$pull: {
				reservationIDs: reservation._id
			}}, {session});

			await db.collection('books').updateOne({_id: book._id}, {$unset: {
				reservationID: null
			}}, {session});

			await db.collection('history').insertOne({
				date: new Date(),
				action: "cancel reservation",
				user: user._id,
				book: book._id
			}, {session});
		} catch (err) {
			utils.logError(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't remove reservation"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		utils.logSuccess("Reservation for book '" + req.params.bookID + "' successfully deleted");
		res.json({
			code: "000",
			message: "Success"
		})
	});
});

// Renew book loan
exports.renewBook = utils.asyncHandler(async (req, res) => {
	// Check date is specified and of a valid format
	if (!req.body.due) {
		res.json({
			code: "003",
			message: "No due date specified"
		});
		return;
	}

	if (!utils.validDate(req.body.due)) {
		res.json({
			code: "003",
			message: "Date not a valid format"
		});
		return;
	}

	// Check book is in the database
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	// Check the book is on loan
	if (!book.loanID) {
		utils.logError("Book '" + req.params.bookID + "' not on loan");
		res.json({
			code: "004",
			message: "Book not on loan"
		});
		return;
	}

	// Update database
	client.withSession(async session => {
		session.startTransaction();

		try {
			// Change due date to renew the loan
			const withdrawID = (await db.collection('loans').findOneAndUpdate({_id: book.loanID}, {$set: {
				dueDate: new Date(req.body.due)
			}})).value.withdrawID;

			// Query history to get user and book IDs (not the most efficient method but it will do)
			const withdrawal = await db.collection('history').findOne({_id: withdrawID});

			await db.collection('history').insertOne({
				date: new Date(),
				action: "renew",
				user: withdrawal.user,
				book: withdrawal.book
			}, {session});
		} catch (err) {
			utils.logError(err.message);
			session.abortTransaction();
			res.json({
				code: "001",
				message: "Couldn't renew book"
			});
			return;
		}

		await session.commitTransaction();
	}).then(() => {
		utils.logSuccess("Book '" + req.params.bookID + "' successfully renewed");
		res.json({
			code: "000",
			message: "Success"
		});
	});

});

// Loan information

// Get loan information
exports.getCurrentLoan = utils.asyncHandler(async (req, res) => {
	// Check book is in the database
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	// Check the book is on loan
	if (!book.loanID) {
		utils.logError("Book '" + req.params.bookID + "' not on loan");
		res.json({
			code: "004",
			message: "Book not on loan"
		});
		return;
	}

	// Check the loan object is in the database
	const loan = await db.collection('loans').findOne({_id: book.loanID});
	if (!loan) {
		utils.logError("Loan '" + book.loanID + "' not found");
		res.json({
			code: "002",
			message: "Loan not found"
		});
		return;
	}

	utils.logSuccess("Loan for book '" + req.params.bookID + "' found");
	res.json({
		code: "000",
		message: "Success",
		data: loan
	});
});

// History

// Get all history for a book
exports.getHistory = utils.asyncHandler(async (req, res) => {
	// Check the book is in the database
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	// Query database for all history then filter to match book
	const history = (await db.collection('history').find().toArray())
		.filter(item => item.book == req.params.bookID);

	// error is used to combine all error handling into one return
	let error = false;

	// Get user data for all history items
	const allData = await Promise.all(history.map(async item => {
		const user = await db.collection('users').findOne({_id: item.user});

		if (!user) {
			error = true;
		} else {
			item.user = user;
			return item;
		}
	}));

	if (error) {
		res.json({
			code: "001",
			message: "Couldn't get history"
		});
		return;
	}

	res.json({
		code: "000",
		message: "Success",
		data: allData
	});
});

// Get a user's history with the book
exports.getUserHistory = utils.asyncHandler(async (req, res) => {
	// Check book is in the database
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	res.json({
		code: "000",
		message: "Success",
		data: (await db.collection('history').find().toArray())
			.filter(item => item.book == req.params.bookID) // Get all items for the book
			.foreach(item => item.user) // Get user data for all items
			.filter((item, pos, items) => items.indexOf(item) == pos) // Remove duplicates
	});
});
