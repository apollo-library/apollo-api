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
