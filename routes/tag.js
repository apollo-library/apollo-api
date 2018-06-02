const tagsRoutes = require('express').Router();
const tagController = require('../controllers/tagController');

tagsRoutes.route('/:tagID')
	.get(tagController.getTag)
	.post(tagController.editTag)

module.exports = tagsRoutes;
