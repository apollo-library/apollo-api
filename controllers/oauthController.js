'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),

// Import middleware
		asyncHandler = require('../middleware').asyncHandler,

// Extras
		utils		= require('../utils'),
		logError	= utils.logError,
		logSuccess	= utils.logSuccess;

// Controllers
