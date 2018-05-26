'use strict';

// Imports
const	express						= require('express'),
		app							= express(),
		port						= 4000,
		config						= require('./config'),

		mongo						= require('./mongo'),
		bodyParser					= require('body-parser'),
		helmet						= require('helmet');
var client;

// Connect to MongoDB
mongo.connect((err) => {
	if (err) {
		console.log(err.message);
		process.exit(1);
	}
	client = mongo.client();

	// Get Request Body
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(bodyParser.json());

	// Protect against some well-known vulnerabilities
	app.use(helmet());

	// Set up routes
	require('./routes')(app);

	app.route('/').get((req, res) => {
		res.send({
			name: config.name,
			version: config.version,
			created_by: config.authors
		});
	});

	// CORS Headers (delete in prod)
	function setCORS(res) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "X-Requested-With, Auth");
		return res;
	}

	app.use('/*', (req, res, next) => {
		console.log(req.method + " request to " + req.url + " with body " + req.body); // FIXME: This doesn't log anything
		res = setCORS(res);
	})

	app.use((req, res) => {
		res.status(404).json({error: req.originalUrl + ' not found'}); // 404 return
	});

	// Error handling middleware
	app.use((err, req, res, next) => {
		console.log("An Error Occurred: " + err.toString());
		res.status(err.status || 500); // Set error response status (default 500)
		res.json({error: "An unexpected error occurred"});
	});

	// Start
	module.exports = app.listen(port, () => {
		console.log('Apollo API started on: ' + port);
	});
})

function cleanup() {
	client.close(); // Close the database connection
	process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
