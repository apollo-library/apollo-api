'use strict';

// Imports
const	express		= require('express'),
		app			= express(),
		config		= require('./config'),

		mongo		= require('./mongo'),
		bodyParser	= require('body-parser'),
		helmet		= require('helmet'),
		utils		= require('./utils');

var client;

// Connect to MongoDB
mongo.connect((err) => {
	if (err) { // Error connecting to MongoDB
		utils.logError(err.message);
		process.exit(1);
	}

	client = mongo.client();

	// Get request body
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(bodyParser.json());

	// Protect against some well-known vulnerabilities
	app.use(helmet());

	// Function to be run on all requests
	app.use('/*', (req, res, next) => {
		// Auth
		const auth = true;

		if (!auth) {
			if (req.method == "POST") {
				console.log("\n\x1b[31m" + new Date().toLocaleString() + ":\x1b[0m Unauthorised POST request to '" + req.originalUrl + "' with body:");
				console.log(req.body);
			} else {
				console.log("\n\x1b[31m" + new Date().toLocaleString() + ":\x1b[0m Unauthorised " + req.method + " request to '" + req.originalUrl + "'");
			}

			res.status(401).json({
				code: "004",
				message: "Unauthorised"
			}); // 401 return
			return;
		}

		// Log request
		if (req.method == "POST") {
			console.log("\n\x1b[33m" + new Date().toLocaleString() + ":\x1b[0m POST request to '" + req.originalUrl + "' with body:");
			console.log(req.body);
		} else {
			console.log("\n\x1b[33m" + new Date().toLocaleString() + ":\x1b[0m " + req.method + " request to '" + req.originalUrl + "'");
		}

		// CORS
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "X-Requested-With");
		
		next();
	})

	// Set up routes
	require('./routes')(app);

	app.route('/').get((req, res) => {
		res.send({
			name: config.name,
			version: config.version,
			created_by: config.authors
		});
	});

	// 404 response
	app.use((req, res) => {
		utils.logError(req.method + " '" + req.originalUrl + "' not found")
		res.status(404).json({
			code: "001",
			message: req.method + " '" + req.originalUrl + "' not found"
		}); // 404 return
	});

	// Error handling middleware
	app.use((err, req, res, next) => {
		utils.logError(err.message);
		res.status(err.status || 500); // Set error response status (default 500)
		res.json({
			code: "001",
			message: "An Unexpected Error Occurred"
		});
	});

	// Start
	app.listen(config.port, () => console.log('\x1b[32mApollo API started on: ' + config.port + '\x1b[0m'));
})

function cleanup() {
	if (client) client.close(); // Close the database connection
	process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
