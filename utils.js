'use strict';
const	fs		= require('fs'),
		http	= require('http'),
		config	= require('./config');

// Handler function to make running asynchronous functions in an express context easier
exports.asyncHandler = (func) => {
	return (req, res, next) => {
		return func(req, res, next).catch(next);
	};
}

// Log string to appropriate logfile (specified in config)
exports.logToFile = string => {
	fs.appendFile(config.logFile, string + '\n', err => {
		if (err) console.log("\x1b[31m[ERROR]\x1b[0m Error writing to logfile: " + err.message);
	});
}

exports.logError = string => {
	console.log("\x1b[31m[ERROR]\x1b[0m " + string); // Red formatted text
	exports.logToFile("[ERROR] " + string);
}

exports.logSuccess = string => {
	console.log("\x1b[32m[SUCCESS]\x1b[0m " + string); // Green formatted text
	exports.logToFile("[SUCCESS] " + string);
}

// Function to make getting all the data (user, book) for a loan easy
exports.getLoanData = async (loans, db) => {
	// error is used to unify the error handling asynchronously
	let error = false;

	const loanData = await Promise.all(loans.map(async loan => {
		const withdraw = await db.collection('history').findOne({_id: loan.withdrawID});
		if (!withdraw) {
			exports.logError("Withdrawal '" + loan.withdrawID + "' not found");
			error = true;
		}

		const book = await db.collection('books').findOne({_id: withdraw.book});
		if (!book) {
			exports.logError("Book '" + withdraw.book + "' not found");
			error = true;
		}

		const user = await db.collection('users').findOne({_id: withdraw.user});
		if (!user) {
			exports.logError("User '" + withdraw.user + "' not found");
			error = true;
		}

		return {
			loan: loan,
			book: book,
			user: user
		}
	}));

	return (error) ? undefined : loanData;
}

// Get all the loan data from a list of IDs
exports.getLoansForIDs = async (loanIDs, db) => {
	// error allows there to be a single error check over the whole map
	let error = false;

	const loans = await Promise.all(loanIDs.map(async loanID => {
		const loan = await db.collection('loans').findOne({_id: loanID});
		if (!loan) {
			exports.logError("Loan '" + loanID + "' not found");
			error = true;
		}
		return loan;
	}));

	const allData = await exports.getLoanData(loans, db);

	// Check if the loan data was found
	if (!allData) error = true;
	else allData.forEach(loan => delete loan.user);

	return (error) ? undefined : allData;
}

// Calculate fine for a loan
exports.calculateFine = (loans) => {
	let fine = 0;

	let now = new Date();
	now.setHours(0,0,0,0);

	loans.map(loan => {
		let due = loan.loan.dueDate;
		due.setHours(0,0,0,0);
		if (loan.loan.dueDate < now) fine += (now.getTime() - due.getTime()) / 4320000 // Fine accumulates at 20p per day
	});

	return fine;
}

// Check is a date string is valid
exports.validDate = (dateString) => {
	console.log("Checking date '" + dateString + "'");

	// Test if the format is yyyy-mm-dd
	if (!/^\d{4}([./-])\d{2}\1\d{2}$/.test(dateString)) {
		exports.logError("Date is not yyyy-mm-dd");
		return false;
	}
	console.log("...Date is yyyy-mm-dd");

	// Check if the date can be converted to a Date object
	const newDate = new Date(dateString);
	if (isNaN(newDate)) {
		exports.logError("Date does not convert to valid object");
		return false;
	}
	console.log("...Date converted to valid object");

	// Check the date is in the future
	var now = new Date();
	now.setHours(0,0,0,0);
	if (newDate > now) {
		console.log("...Date is in future");
		exports.logSuccess("Date is vaild")
		return true;
	} else {
		exports.logError("Date is not in future");
		return false;
	}
};

// Connect to the API via GET or POST
exports.connectAPI = (url, body) => {
	return new Promise((resolve, reject) => {
		var req = http.request({
			host: 'localhost',
			port: config.port,
			method: body ? 'POST' : 'GET', // If a body is specified, POST
			path: url,
			headers: {
				'Content-Type': 'application/json; charset=utf-8'
			}
		}, res => {
			// Read the data into a string and resolve it when the data transfer is finished
			let str = '';
			res.on('data', chunk => str += chunk);
			res.on('end', () => resolve(str));
		}).on('error', err => {
			exports.logError(err);
		});

		if (body) req.write(JSON.stringify(body)); // Add JSON data to req if it exists
		req.end();
	});
}
