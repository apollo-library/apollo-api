'use strict';

// Mongo Setup
const	mongo	=		require('../mongo'),
		db		=		mongo.db(),
		client	=		mongo.client();

// Import middleware
const asyncHandler = require('../middleware/asyncHandler');

exports.getBooks = asyncHandler(async function(req, res) {
	res.json({books: await db.collection('books').find().toArray()});
});

exports.addBook = asyncHandler(async function(req, res) {
	client.withSession(async session => {
		session.startTransaction();

		try {
			// This doesn't do what the function's supposed to but is just here to test multi-document ACID transactions
			await db.collection('books').insertOne({title: req.body.title}, {session});
			await db.collection('students').insertOne({name: req.body.name}, {session});
		} catch (err) {
			if (err) console.dir(err);
			session.abortTransaction();
			res.json({error: err.message});
		}

		await session.commitTransaction();
	}).then(() => res.json({message: "success"}));
});
