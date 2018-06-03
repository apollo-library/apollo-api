'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Extras
		utils		= require('../utils');

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
	const tagNames = tags.map(i => i.name);
	const newTags = req.body.tags ? req.body.tags.filter(tag => !tagNames.includes(tag)) : [];

	const addedTags = [];

	if (newTags.length) {
		newTags.forEach(async tag => {
			try {
				await db.collection('tags').insertOne({
					_id: tags.length ? tags[0]._id + 1: 0,
					name: tag
				});
				utils.logSuccess("Added tag '" + tag + "'");
				addedTags.push(tag);
			} catch (err) {
				utils.logError(err);
			}
		})
	}

	try {
		await db.collection('books').insertOne({
			_id:		req.body.id,
			ISBN10:		req.body.isbn10		|| "ISBN13",
			ISBN13:		req.body.isbn13		|| "ISBN10",
			title:		req.body.title		|| "Unknown Title",
			author:		req.body.author		|| "Unknown Author",
			publisher:	req.body.publisher	|| "Unknown Publisher",
			tags:		req.body.tags		|| []
		});
	} catch (err) {
		utils.logError(err.message);
		res.json({
			code: "001",
			message: "Couldn't add book"
		});
		return;
	}

	var returnObj = {
		code: "000",
		message: "Success"
	}
	if (addedTags.length) returnObj.tags = addedTags;

	utils.logSuccess("Book '" + req.body.id + "' successfully added");
	res.json(returnObj);
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
		await db.collection('books').find({$text: {$search: req.body.query}}).toArray() :
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
