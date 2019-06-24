// Ingest Books
const	fs			= require('fs'),
		config		= require('../config'),
		utils		= require('../utils');

if (process.argv.length < 3) {
	console.log('Please specify a file');
	return;
}

let lines = fs.readFileSync(process.argv[2]).toString().split('\n');
const fields = lines[0].trim().split(',').map(field => field.toLowerCase());
lines.shift();

(async () => {
	for (let i = 0; i < lines.length; i++) {
		if (!lines[i].length) return;

		let lineData = {}
		let line = lines[i].trim().split(',');
		for (let i = 0; i < fields.length; i++) {
			lineData[fields[i]] = line[i];
		}

		const book = JSON.parse((await utils.connectAPI('/book/' + escape(lineData.id))).substring(9));
		if (book.data) {
			utils.logError("Book '" + lineData.id + "' already exists");
			return;
		}

		let result = JSON.parse((await utils.connectAPI('/books', lineData)).substring(9));

		if (result.code == "000") utils.logSuccess("Added book '" + lineData.id + "'")
		else utils.logError("Failed to add book '" + lineData.id + "', error " + result.code + ": '" + result.message + "'");
	}
})();
