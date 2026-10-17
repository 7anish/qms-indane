const router = require('express').Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.get('/', dashboardController.getDashboard);

module.exports = router;
