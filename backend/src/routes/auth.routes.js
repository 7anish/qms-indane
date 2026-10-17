const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { loginRules, changePasswordRules } = require('../validators/admin.validator');

router.post('/login', validate(loginRules), authController.login);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.me);
router.patch('/change-password', protect, validate(changePasswordRules), authController.changePassword);

module.exports = router;
