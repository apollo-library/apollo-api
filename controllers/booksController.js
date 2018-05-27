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
	if (!req.body.id) {
		res.json({error: "No ID specified"});
		return;
	}
	const book = await db.collection('books').findOne({id: req.body.id});

	if (book) {
		res.json({error: "Book already exists"});
		return;
	}

	// TODO: Add validation on all params
	try {
		await db.collection('books').insertOne({
			id: req.body.id
			// Other params go here
		});
	} catch (err) {
		if (err) console.log(err.message);
		res.json({error: "Couldn't add book"});
		return;
	}

	res.json({message: "Success"});
});
