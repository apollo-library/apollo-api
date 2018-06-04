// Ingest Books
const	fs			= require('fs'),
		readline	= require('readline'),
		http		= require('http'),

		{google}	= require('googleapis'),
		isbn		= require('node-isbn'),

		config		= require('../config'),
		utils		= require('../utils'),

		SCOPES		= ['https://www.googleapis.com/auth/spreadsheets.readonly'],
		TOKEN_PATH	= 'credentials.json';

/* === BEGIN GOOGLE AUTH FUNCTIONS === */

// Create an OAuth2 client with the given credentials
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
	  client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
	if (err) return getNewToken(oAuth2Client, callback);
	oAuth2Client.setCredentials(JSON.parse(token));
	callback(oAuth2Client);
  });
}

// Get and store new token after prompting for user authorization
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
	access_type: 'offline',
	scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
	rl.close();
	oAuth2Client.getToken(code, (err, token) => {
	  if (err) return callback(err);
	  oAuth2Client.setCredentials(token);
	  // Store the token to disk for later program executions
	  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
		if (err) console.error(err);
		console.log('Token stored to', TOKEN_PATH);
	  });
	  callback(oAuth2Client);
	});
  });
}

/* === END GOOGLE AUTH FUNCTIONS === */

function connectAPI(url, body) {
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
			str = '';
			res.on('data', chunk => str += chunk);
			res.on('end', () => resolve(str));
		}).on('error', err => {
			utils.logError(err);
		});

		if (body) req.write(JSON.stringify(body));
		req.end();
	});
}

async function getBookData(ISBN) {
	return new Promise(resolve => {
		isbn.resolve(ISBN, async (err, book) => {
			if (err) resolve({categories: []});
			else resolve(book);
		})
	})
}

async function addBook(row) {
	if (!row[0]) return;
	const book = JSON.parse(
		(await connectAPI('/book/' + escape(row[0])))
		.substring(9)
	);
	if (book.data) {
		utils.logError("Book '" + escape(row[0]) + "' already exists");
		return;
	}

	const	isbn10Data		= row[1] ? await getBookData(row[1]) : {categories: []},
			isbn13Data		= row[2] ? await getBookData(row[2]) : {categories: []},
			combinedData	= {...isbn10Data, ...isbn13Data};

	if (combinedData.industryIdentifiers && combinedData.industryIdentifiers.length) {
		const	isbn10Filtered = combinedData.industryIdentifiers.filter(item => item.type.includes("10")),
				isbn13Filtered = combinedData.industryIdentifiers.filter(item => item.type.includes("13"));

		if (isbn10Filtered.length) combinedData.isbn10 = isbn10Filtered[0].identifier;
		if (isbn13Filtered.length) combinedData.isbn13 = isbn13Filtered[0].identifier;
	}

	if (!isbn10Data.categories) isbn10Data.categories = [];
	if (!isbn13Data.categories) isbn13Data.categories = [];

	if (isbn10Data.categories.length || isbn13Data.categories.length) {
		combinedData.categories = isbn10Data.categories.concat(isbn13Data.categories.filter(tag => !isbn10Data.categories.includes(tag)));

		// Separate items with commas
		let newTags = [];

		combinedData.categories.forEach(tag => {
			const commaSplit = tag.split(', ');
			commaSplit.forEach(splitTag => {
				// Separate items with dashes
				newTags = newTags.concat(splitTag.split(' - '));
			});
		});
		combinedData.categories = newTags;
	}

	let result = JSON.parse((await connectAPI('/books', {
		id:			row[0],
		isbn10:		combinedData.isbn10 || row[1] || "ISBN10",
		isbn13:		combinedData.isbn13 || row[2] || "ISBN13",
		title:		combinedData.title || row[3] || "Unknown Title",
		author:		((combinedData.authors && combinedData.authors.length) ? combinedData.authors.join(', ') : null) || (row[4] ? row[4].replace(' (Author)', '').replace('by ', '') : "Unknown Author"),
		publisher:	combinedData.publisher || row[5] || "Unknown Publisher",
		tags:		combinedData.categories || []
	})).substring(9));

	console.log(result);
	result.code == "000" ? utils.logSuccess("Added book '" + row[0] + "'") : utils.logError("Failed to add book '" + row[0] + "'");
}

/* === BEGIN MAIN CODE === */

// Load client secrets from a local file.
fs.readFile('client_secret.json', (err, content) => {
	if (err) return console.log('Error loading client secret file:', err);

	// Authorize a client with credentials, then call the Google Sheets API.
	authorize(JSON.parse(content), auth => {
		const sheets = google.sheets({version: 'v4', auth});
		sheets.spreadsheets.values.get({
			spreadsheetId: '1udj-p0ZtxmMtsctb-6VfozwR5BLMWe-Vye51X2zjkHU',
			range: 'Current Stock!A2:F'
		}, (err, {data}) => {
			if (err) return console.log('The API returned an error: ' + err);

			const rows = data.values;
			if (!rows.length) return;

			(async () => {
				for (let i = 0; i < rows.length; i++) {
					console.log("\nRow " + (i+1) + " of " + rows.length + ":");
					await addBook(rows[i]);
				}
			})();
		});
	});
});
