const router = require('express').Router();
const termController = require('../controllers/term.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { termIdRules, createTermRules, updateTermRules } = require('../validators/term.validator');

// Any logged-in admin can manage Terms & Conditions
router.use(protect);

router.get('/', termController.list);
router.post('/', validate(createTermRules), termController.create);
router.get('/:termId', validate(termIdRules), termController.getOne);
router.patch('/:termId', validate(updateTermRules), termController.update);
router.delete('/:termId', validate(termIdRules), termController.remove);

module.exports = router;
