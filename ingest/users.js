// Ingest Books
const	fs			= require('fs'),
		readline	= require('readline'),
		http		= require('http'),

		{google}	= require('googleapis'),

		config		= require('../config'),
		utils		= require('../utils'),

		SCOPES		= ['https://www.googleapis.com/auth/spreadsheets.readonly'],
		TOKEN_PATH	= 'credentials.json';

if (process.argv.length < 3) {
	console.log('Please specify a spreadsheet id');
	return;
}
const spreadsheet = process.argv[2];

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

async function addUser(row) {
	if (!row[0]) return;
	// const user = JSON.parse(
	// 	(await connectAPI('/user/' + escape(row[0])))
	// 	.substring(9)
	// );
	// if (user.data) {
	// 	utils.logError("User '" + row[0] + "' already exists");
	// 	return;
	// }

	let result = JSON.parse((await connectAPI('/users', {
		id: row[0],
		forename: row[1],
		surname: row[2],
		year: row[3],
		reg: row[4],
		email: row[5],
	})).substring(9));

	if (result.code == "004") {
		let newResult = JSON.parse((await connectAPI('/user/' + row[0], {
			forename: row[1],
			surname: row[2],
			year: row[3],
			reg: row[4],
			email: row[5],
		})).substring(9));

		newResult.code == "000" ? utils.logSuccess("Updated user '" + row[0] + "'") : utils.logError("Failed to update user '" + row[0] + "', error " + newResult.code + ": '" + newResult.message + "'");
	} else {
		result.code == "000" ? utils.logSuccess("Added user '" + row[0] + "'") : utils.logError("Failed to add user '" + row[0] + "', error " + result.code + ": '" + result.message + "'");
	}
}

/* === BEGIN MAIN CODE === */

// Load client secrets from a local file.
fs.readFile('client_secret.json', (err, content) => {
	if (err) return console.log('Error loading client secret file:', err);

	// Authorize a client with credentials, then call the Google Sheets API.
	authorize(JSON.parse(content), auth => {
		const sheets = google.sheets({version: 'v4', auth});
		sheets.spreadsheets.values.get({
			spreadsheetId: spreadsheet,
			range: 'Users!A2:F'
		}, (err, {data}) => {
			if (err) return console.log('The Google Sheets API returned an error: ' + err);

			const rows = data.values;
			if (!rows.length) return;

			(async () => {
				for (let i = 0; i < rows.length; i++) {
					await addUser(rows[i]);
				}
			})();
		});
	});
});
