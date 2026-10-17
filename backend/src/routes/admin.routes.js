const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { ROLES } = require('../config/constants');
const {
  createAdminRules,
  updateAdminRules,
  idParamRules,
} = require('../validators/admin.validator');

router.use(protect);

router.get('/stats', adminController.stats);
router.get('/', adminController.list);
router.get('/:id', validate(idParamRules), adminController.getOne);

// Only super admins can manage other admins
router.post('/', authorize(ROLES.SUPER_ADMIN), validate(createAdminRules), adminController.create);
router.patch('/:id', authorize(ROLES.SUPER_ADMIN), validate(updateAdminRules), adminController.update);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), validate(idParamRules), adminController.remove);

module.exports = router;
