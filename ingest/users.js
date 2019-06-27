// Ingest Books
const	fs			= require('fs'),
		config		= require('../config'),
		utils		= require('../utils');

if (process.argv.length < 3) {
	console.log('Please specify a file');
	return;
}

let lines = fs.readFileSync(process.argv[2]).toString().split('\n'); // Read file and split into lines
const fields = lines[0].trim().split(',').map(field => field.toLowerCase()); // Split first line on commas to find field names
lines.shift(); // Remove column titles from array

// This function uploads all the items asynchronously
(async () => {
	for (let i = 0; i < lines.length; i++) {
		if (!lines[i].length) return; // Don't do anything if the line is empty

		// Split line by commas and add the data for each field to an object
		let lineData = {}
		let line = lines[i].trim().split(',');
		for (let i = 0; i < fields.length; i++) {
			lineData[fields[i]] = line[i];
		}

		let result = JSON.parse((await utils.connectAPI('/users', lineData)).substring(9));

		if (result.code == "004") {
			// If the user already exists, POST new data to update the user
			let newResult = JSON.parse((await utils.connectAPI('/user/' + escape(lineData.id), lineData)).substring(9));

			if (newResult.code == "000") utils.logSuccess("Updated user '" + lineData.id + "'");
			else utils.logError("Failed to update user '" + lineData.id + "', error " + newResult.code + ": '" + newResult.message + "'");
		} else {
			if (result.code == "000") utils.logSuccess("Added user '" + lineData.id + "'")
			else utils.logError("Failed to add user '" + lineData.id + "', error " + result.code + ": '" + result.message + "'");
		}
	}
})();
