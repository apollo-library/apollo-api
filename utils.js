'use strict';
const	fs		= require('fs'),
		http	= require('http'),
		config	= require('./config');


exports.asyncHandler = (func) => {
	return (req, res, next) => {
		return func(req, res, next).catch(next);
	};
}

function logToFile(string) {
	fs.appendFile(config.logFile, string + '\n', err => {
		if (err) console.log("\x1b[31m[ERROR]\x1b[0m Error writing to logfile: " + err.message);
	});
}
exports.logToFile = logToFile

exports.logError = string => {
	console.log("\x1b[31m[ERROR]\x1b[0m " + string);

	logToFile("[ERROR] " + string);
}

exports.logSuccess = string => {
	console.log("\x1b[32m[SUCCESS]\x1b[0m " + string);

	logToFile("[SUCCESS] " + string);
}

exports.getLoanData = async (loans, db) => {
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

exports.getLoansForIDs = async (loanIDs, db) => {
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

	if (!allData) error = true;
	else allData.forEach(loan => delete loan.user);

	return (error) ? undefined : allData;
}

exports.calculateFine = (loans) => {
	let fine = 0;

	let now = new Date();
	now.setHours(0,0,0,0);

	let due = loan.loan.dueDate;
	due.setHours(0,0,0,0);

	loans.map(loan => {
		if (loan.loan.dueDate < now) fine += (now.getTime() - due.getTime()) / 4320000
	});

	return fine;
}

exports.validDate = (dateString) => {
	console.log("Checking date '" + dateString + "'");

	// yyyy-mm-dd
	if (!/^\d{4}([./-])\d{2}\1\d{2}$/.test(dateString)) {
		exports.logError("Date is not yyyy-mm-dd");
		return false;
	}
	console.log("...Date is yyyy-mm-dd");

	const newDate = new Date(dateString);
	if (isNaN(newDate)) {
		exports.logError("Date does not convert to valid object");
		return false;
	}
	console.log("...Date converted to valid object");

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

exports.connectAPI = (url, body) => {
	return new Promise((resolve, reject) => {
		var req = http.request({
			host: 'localhost',
			port: config.port,
			method: body ? 'POST' : 'GET',
			path: url,
			headers: {
				'Content-Type': 'application/json; charset=utf-8'
			}
		}, res => {
			let str = '';
			res.on('data', chunk => str += chunk);
			res.on('end', () => resolve(str));
		}).on('error', err => {
			exports.logError(err);
		});

		if (body) req.write(JSON.stringify(body));
		req.end();
	});
}
