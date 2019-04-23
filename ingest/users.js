// Ingest Books
const	fs			= require('fs'),
		config		= require('../config'),
		utils		= require('../utils');

if (process.argv.length < 3) {
	console.log('Please specify a file');
	return;
}

let lines = fs.readFileSync(process.argv[2]).toString().split('\n');
const fields = lines[0].trim().split(',');
lines.shift();

(async () => {
	for (let i = 0; i < lines.length; i++) {
		if (!lines[i].length) return;

		let lineData = {}
		let line = lines[i].trim().split(',');
		for (let i = 0; i < fields.length; i++) {
			lineData[fields[i]] = line[i];
		}

		let result = JSON.parse((await utils.connectAPI('/users', lineData)).substring(9));

		if (result.code == "004") {
			let newResult = JSON.parse((await utils.connectAPI('/user/' + escape(lineData.id), lineData)).substring(9));

			if (newResult.code == "000") utils.logSuccess("Updated user '" + lineData.id + "'");
			else utils.logError("Failed to update user '" + lineData.id + "', error " + newResult.code + ": '" + newResult.message + "'");
		} else {
			if (result.code == "000") utils.logSuccess("Added user '" + lineData.id + "'")
			else utils.logError("Failed to add user '" + lineData.id + "', error " + result.code + ": '" + result.message + "'");
		}
	}
})();
