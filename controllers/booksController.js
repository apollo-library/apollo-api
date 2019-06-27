'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),

// Extras
		utils	= require('../utils');

// Get info for all books
exports.getBooks = utils.asyncHandler(async (req, res) => {
	res.json({
		code: "000",
		message: "Success",
		data: await db.collection('books').find({deleted: false}).toArray()
	});
});

// Add book to database
exports.addBook = utils.asyncHandler(async (req, res) => {
	if (!req.body.id) {
		res.json({
			code: "003",
			message: "No ID specified"
		});
		return;
	}

	// Check if book is already in the database and return an error if it does
	const book = await db.collection('books').findOne({_id: req.body.id});
	if (book) {
		utils.logError("Book '" + req.body.id + "' already exists");
		res.json({
			code: "004",
			message: "Book already exists"
		});
		return;
	}

	// If tags are not an array, return an error
	if (req.body.tags && !req.body.tags.constructor === Array) {
		utils.logError("Tags '" + req.body.tags + "' not an array");
		res.json({
			code: "003",
			message: "Tags must be an array"
		});
		return;
	}

	// Detect if there are any tags not in the database
	const tags = req.body.tags ? await db.collection('tags').find().sort({_id: -1}).toArray() : [];
	const tagIDs = tags.map(t => t._id.toString());
	const newTags = req.body.tags ? req.body.tags.filter(tag => !tagIDs.includes(tag)) : [];

	// If any of the tags aren't in the database, return an error
	if (newTags.length) {
		utils.logError("Tag " + (newTags.length > 1 ? "IDs" : "ID") + " '" + newTags.join("', '") + "' not found"); // 
		res.json({
			code: "004",
			message: "Tag not found"
		});
		return;
	}

	// Add book to database
	try {
		await db.collection('books').insertOne({
			_id:		req.body.id,
			ISBN10:		req.body.isbn10		|| "ISBN13",
			ISBN13:		req.body.isbn13		|| "ISBN10",
			title:		req.body.title		|| "Unknown Title",
			author:		req.body.author		|| "Unknown Author",
			publisher:	req.body.publisher	|| "Unknown Publisher",
			tags: 		req.body.tags		|| [],
			deleted: 	false
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


// Search for a book
exports.searchBooks = utils.asyncHandler(async (req, res) => {
	if (!req.body.query && !req.body.filters) {
		res.send({
			code: "003",
			message: "No search query"
		});
		return;
	}

	let results = [];

	if (req.body.query) {
		const regex = new RegExp(req.body.query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'gi'); // Regex to fuzzy search
		results = await db.collection('books').find({$or: [
			// Exact matches on ID, ISBN10, and ISBN13
			{_id: req.body.query},
			{ISBN10: req.body.query},
			{ISBN13: req.body.query},

			// Fuzzy matches on title and author
			{title: {$regex: regex}},
			{author: {$regex: regex}}
		]}).toArray();
	} else {
		results = await db.collection('books').find().toArray(); // If no query is specified, return all books
	}

	// Filter results based on requested filters
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
