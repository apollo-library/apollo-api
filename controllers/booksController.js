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

	if (req.body.tags && !req.body.tags.constructor === Array) {
		res.json({error: "Tags must be an array"});
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
		res.json({error: "Couldn't add book"});
		return;
	}

	res.json(addedTags.length ? {message:"Success", tags: addedTags} : {message: "Success"});
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