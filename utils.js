'use strict';
const	fs		= require('fs'),
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
