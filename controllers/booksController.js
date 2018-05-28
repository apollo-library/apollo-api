'use strict';

// Mongo Setup
const	mongo	= require('../mongo'),
		db		= mongo.db(),
		client	= mongo.client();

// Import middleware
const asyncHandler = require('../middleware').asyncHandler;

exports.getBooks = asyncHandler(async (req, res) => {
	res.json({
		code: "000",
		message: "Success",
		books: await db.collection('books').find().toArray()
	});
});

exports.addBook = asyncHandler(async (req, res) => {
	if (!req.body.id) {
		res.json({
			code: "003",
			message: "No ID Specified"
		});
		return;
	}
	
	const book = await db.collection('books').findOne({_id: req.body.id});
	if (book) {
		res.json({
			code: "004",
			message: "Book Already Exists"
		});
		return;
	}

	if (req.body.tags && !req.body.tags.constructor === Array) {
		res.json({
			code: "003",
			message: "Tags Must Be An Array"
		});
		return;
	}

	const tags = req.body.tags ? await db.collection('tags').find().sort({_id: -1}).toArray() : [];
	const tagNames = tags.map(i => i.name);
	const newTags = req.body.tags.filter(tag => !tagNames.includes(tag));

	const addedTags = [];

	if (newTags.length) {
		newTags.forEach(async tag => {
			try {
				await db.collection('tags').insertOne({
					_id: tags.length ? tags[0]._id + 1: 0,
					name: tag
				});
				console.log("Added tag " + tag)
				addedTags.push(tag)
			} catch (err) {
				console.log(err);
			}
		})
	}

	try {
		await db.collection('books').insertOne({
			_id:		req.body.id,
			ISBN10:		req.body.isbn10			|| "ISBN13",
			ISBN13:		req.body.isbn13			|| "ISBN10",
			title:		req.body.title			|| "Unknown Title",
			author:		req.body.author			|| "Unknown Author",
			publisher:	req.body.publisher		|| "Unknown Publisher",
			tags:		req.body.tags			|| []
		});
	} catch (err) {
		console.log(err.message);
		res.json({
			code: "001",
			message: "Couldn't Add Book"
		});
		return;
	}

	var returnObj = {
		code: "000",
		message: "Success"
	}

	if (addedTags.length) returnObj.tags = addedTags
	res.json(returnObj);
});


exports.searchBooks = asyncHandler(async (req, res) => {
	if (!req.body.query) {
		res.send({
			code: "003",
			message: "No Search Query"
		});
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