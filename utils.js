exports.logError = string => {
	console.log("\x1b[31m[ERROR]\x1b[0m " + string);
}

exports.logSuccess = string => {
	console.log("\x1b[32m[SUCCESS]\x1b[0m " + string);
}