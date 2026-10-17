const router = require('express').Router();
const templateController = require('../controllers/emailTemplate.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { templateIdRules, createTemplateRules, updateTemplateRules } = require('../validators/emailTemplate.validator');

// Any logged-in admin can manage email templates
router.use(protect);

router.get('/variables', templateController.variables);
router.get('/', templateController.list);
router.post('/', validate(createTemplateRules), templateController.create);
router.get('/:templateId', validate(templateIdRules), templateController.getOne);
router.patch('/:templateId', validate(updateTemplateRules), templateController.update);
router.delete('/:templateId', validate(templateIdRules), templateController.remove);

module.exports = router;
