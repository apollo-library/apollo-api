'use strict';

exports.asyncHandler = (func) => {
	return (req, res, next) => {
		return func(req, res, next).catch(next);
	};
}

exports.auth = (req, res, next) => {
	return next();
}