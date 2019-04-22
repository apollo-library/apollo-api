'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),
		client	= mongo.client(),

// Extras
		config	= require('../config'),
		utils	= require('../utils');

function validDate(dateString) {
	console.log("Checking date '" + dateString + "'");

	// yyyy-mm-dd
	if (!/^\d{4}([./-])\d{2}\1\d{2}$/.test(dateString)) {
		utils.logError("Date is not yyyy-mm-dd");
		return false;
	}
	console.log("...Date is yyyy-mm-dd");

	const newDate = new Date(dateString);
	if (isNaN(newDate)) {
		utils.logError("Date does not convert to valid object");
		return false;
	}
	console.log("...Date converted to valid object");

	var now = new Date();
	now.setHours(0,0,0,0);
	if (newDate > now) {
		console.log("...Date is in future");
		utils.logSuccess("Date is vaild")
		return true;
	} else {
		utils.logError("Date is not in future");
		return false;
	}
};

// Book info

exports.getBook = utils.asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
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

exports.editBook = utils.asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	const tags = req.body.tags ? await db.collection('tags').find().sort({_id: -1}).toArray() : [];
	const tagIDs = tags.map(t => t._id.toString());
	const newTags = req.body.tags.filter(tag => !tagIDs.includes(tag));

	if (newTags.length) {
		utils.logError("Tag " + (newTags.length > 1 ? "IDs" : "ID") + " '" + newTags.join("', '") + "' not found");
		res.json({
			code: "004",
			message: "Tag not found"
		});
		return;
	}

	try {
		await db.collection('books').updateOne({_id: book._id}, {$set: {
			ISBN10:		req.body.ISBN10		|| book.ISBN10,
			ISBN13:		req.body.ISBN13		|| book.ISBN13,
			title:		req.body.title		|| book.title,
			author:		req.body.author		|| book.author,
			publisher:	req.body.publisher	|| book.publisher,
			tags:		req.body.tags		|| book.tags
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
		await db.collection('books').deleteOne({_id: book._id});
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

exports.withdrawBook = utils.asyncHandler(async (req, res) => {
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

	const reservation = book.reservationID ? await db.collection('reservations').findOne({_id: book.reservationID}) : null;

	if (reservation && reservation.userID != user._id) {
		utils.logError("Book '" + req.params.bookID + "' reserved");
		res.json({
			code: "004",
			message: "Book reserved"
		});
		return;
	}

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

			await db.collection('reservations').deleteOne({_id: book.reservationID})
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
		})
	});
});

exports.depositBook = utils.asyncHandler(async (req, res) => {
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

exports.reserveBook = utils.asyncHandler(async (req, res) => {
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

	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	if (book.reservationID) {
		utils.logError("Book '" + req.params.bookID + "' already reserved");
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

exports.getReservation = utils.asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}
	if (!book.reservationID) {
		utils.logError("Book '" + req.params.bookID + "' not reserved");
		res.json({
			code: "004",
			message: "Book not reserved"
		});
		return;
	}

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

exports.deleteReservation = utils.asyncHandler(async (req, res) => {
	if (!req.body.userID) {
		res.json({
			code: "003",
			message: "No user ID specified"
		});
		return;
	}

	const user = await db.collection('users').findOne({_id: req.body.userID});
	if (!user) {
		utils.logError("User '" + req.params.userID + "' not found");
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
	if (!book.reservationID) {
		utils.logError("Book '" + req.params.bookID + "' not reserved");
		res.json({
			code: "004",
			message: "Book not reserved"
		});
		return;
	}

	const reservation = await db.collection('reservations').findOne({_id: book.reservationID});
	if (!reservation) {
		utils.logError("Reservation for book '" + req.params.bookID + "' not reserved");
		res.json({
			code: "002",
			message: "Reservation not found"
		});
		return;
	}

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

exports.renewBook = utils.asyncHandler(async (req, res) => {
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
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "004",
			message: "Book not on loan"
		});
		return;
	}

	client.withSession(async session => {
		session.startTransaction();

		try {
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

// Loans information
exports.getCurrentLoan = utils.asyncHandler(async (req, res) => {
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

	utils.logSuccess("Loan for book '" + req.params.bookID + "' found");
	res.json({
		code: "000",
		message: "Success",
		data: loan
	});
});

// History

exports.getHistory = utils.asyncHandler(async (req, res) => {
	const book = await db.collection('books').findOne({_id: req.params.bookID});
	if (!book) {
		utils.logError("Book '" + req.params.bookID + "' not found");
		res.json({
			code: "002",
			message: "Book not found"
		});
		return;
	}

	const history = (await db.collection('history').find().toArray())
		.filter(item => item.book == req.params.bookID);

	let error = false;
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

exports.getUserHistory = utils.asyncHandler(async (req, res) => {
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
			.filter(item => item.book == req.params.bookID)
			.foreach(item => item.user)
			.filter((item, pos, items) => items.indexOf(item) == pos)
	});
});
