'use strict';

// Imports
const	express						= require('express'),
		app							= express(),
		port						= process.env.PORT || 4000,
		config						= require('./config'),

		mongoose					= require('mongoose'),
		bodyParser					= require('body-parser'),
		helmet						= require('helmet'),
		{asyncMonitor, pkgMonitor}	= require('async-optics');

// Mongoose setup
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/apollodb');
mongoose.set('debug', true);

// AsyncOptics
asyncMonitor(4001);
pkgMonitor('./package');

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
	res = setCORS(res);
})

app.use((req, res) => {
	res.status(404).json({error: req.originalUrl + ' not found'}); // 404 return
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.log("An Error Occurred: " + err.message);
	res.status(err.status || 500); // Set error response status (default 500)
	res.json({error: "An unexpected error occurred"});
});

// Start
module.exports = app.listen(port, () => {
	console.log('Apollo API started on: ' + port);
});
