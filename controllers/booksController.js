'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),

// Extras
		utils	= require('../utils');

exports.getBooks = utils.asyncHandler(async (req, res) => {
	res.json({
		code: "000",
		message: "Success",
		data: await db.collection('books').find().toArray()
	});
});

exports.addBook = utils.asyncHandler(async (req, res) => {
	if (!req.body.id) {
		res.json({
			code: "003",
			message: "No ID specified"
		});
		return;
	}

	const book = await db.collection('books').findOne({_id: req.body.id});
	if (book) {
		utils.logError("Book '" + req.body.id + "' already exists");
		res.json({
			code: "004",
			message: "Book already exists"
		});
		return;
	}

	if (req.body.tags && !req.body.tags.constructor === Array) {
		utils.logError("Tags '" + req.body.tags + "' not an array");
		res.json({
			code: "003",
			message: "Tags must be an array"
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
		await db.collection('books').insertOne({
			_id:		req.body.id,
			ISBN10:		req.body.isbn10		|| "ISBN13",
			ISBN13:		req.body.isbn13		|| "ISBN10",
			title:		req.body.title		|| "Unknown Title",
			author:		req.body.author		|| "Unknown Author",
			publisher:	req.body.publisher	|| "Unknown Publisher",
			tags: 		req.body.tags		|| []
		});
	} catch (err) {
		utils.logError(err.message);
		res.json({
			code: "001",
			message: "Couldn't add book"
		});
		return;
	}

	utils.logSuccess("Book '" + req.body.id + "' successfully added");
	res.json({
		code: "000",
		message: "Success"
	});
});


exports.searchBooks = utils.asyncHandler(async (req, res) => {
	if (!req.body.query && !req.body.filters) {
		res.send({
			code: "003",
			message: "No search query"
		});
		return;
	}

	const results = req.body.query ?
		await db.collection('books').find({$or: [
			{_id: req.body.query},
			{$text: {$search: req.body.query}},
		]}).toArray() :
		await db.collection('books').find().toArray()
	const filtered = req.body.filters ? results.filter(result => {
		return result.tags ? result.tags.some(r => req.body.filters.includes(r)) : false;
	}) : results;

	res.send({
		code: "000",
		message: "Success",
		count: filtered.length,
		data: filtered
	});
})
