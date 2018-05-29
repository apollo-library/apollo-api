'use strict';

exports.asyncHandler = (func) => {
	return (req, res, next) => {
		return func(req, res, next).catch(next);
	};
}

exports.logError = string => {
	console.log("\x1b[31m[ERROR]\x1b[0m " + string);
}

exports.logSuccess = string => {
	console.log("\x1b[32m[SUCCESS]\x1b[0m " + string);
}