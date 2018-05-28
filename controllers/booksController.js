'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),
		client	= mongo.client();

// Import middleware
const asyncHandler = require('../middleware').asyncHandler;

exports.getBooks = asyncHandler(async (req, res) => {
	res.json({books: await db.collection('books').find().toArray()});
});

exports.addBook = asyncHandler(async (req, res) => {
	if (!req.body.id) {
		res.json({error: "No ID specified"});
		return;
	}
	
	const book = await db.collection('books').findOne({_id: req.body.id});
	if (book) {
		res.json({error: "Book already exists"});
		return;
	}

	// TODO: Add validation on all params
	try {
		await db.collection('books').insertOne({
			_id: req.body.id,
			title: req.body.title,
			author: req.body.author,
			tags: req.body.tags
			// Other params go here
		});
	} catch (err) {
		if (err) console.log(err.message);
		res.json({error: "Couldn't add book"});
		return;
	}

	res.json({message: "Success"});
});


exports.searchBooks = asyncHandler(async (req, res) => {
	if (!req.body.query) {
		res.send({error: "No search query"});
		return;
	}

	const results = await db.collection('books').find({$text: {$search: req.body.query}}).toArray();
	const filtered = req.body.filters ? results.filter(result => {
		return result.tags ? result.tags.some(r => req.body.filters.includes(r)) : false;
	}) : results;
	res.send({
		message: "Success",
		count: filtered.length,
		results: filtered
	});
})