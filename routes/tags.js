const tagsRoutes = require('express').Router();
const tagsController = require('../controllers/tagsController');

tagsRoutes.route('/')
	.get(tagsController.getTags)
	.post(tagsController.addTag)

module.exports = tagsRoutes;
