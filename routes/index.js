'use strict';

const	fs			= require('fs'),
		excluded	= ['index']; // index.js is not a router

module.exports = app => {
	fs.readdirSync(__dirname).forEach(file => { // read all files in directory
		var basename = file.split('.')[0];

		if (!fs.lstatSync(__dirname + '/' + file).isDirectory() && !excluded.includes(basename)) {
			// If not a directory and not excluded
			app.use('/' + basename, require('./' + file));
		}
	});
};
