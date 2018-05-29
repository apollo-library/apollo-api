'use strict';

// Mongo Setup
const	mongo		= require('../mongo'),
		db			= mongo.db(),
		client		= mongo.client(),
		utils		= require('../utils'),
		logError	= utils.logError,
		logsuccess	= utils.logSuccess;

// Import middleware
const asyncHandler = require('../middleware').asyncHandler;

// Controllers
