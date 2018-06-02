const historyRoutes = require('express').Router();
const historyController = require('../controllers/historyController');

historyRoutes.route('/')
    .get(historyController.getHistory)

module.exports = historyRoutes;
