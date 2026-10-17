const router = require('express').Router();
const quotationController = require('../controllers/quotation.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  quotationIdRules,
  quotationPayloadRules,
  draftPayloadRules,
  composeEmailRules,
  sendEmailRules,
} = require('../validators/quotation.validator');

router.use(protect);

router.get('/', quotationController.list);
router.get('/recent-copy-addresses', quotationController.recentCopyAddresses);
router.get('/companies', quotationController.companySummaries);
router.post('/preview', validate(quotationPayloadRules), quotationController.preview);
router.post('/email-preview', validate(quotationPayloadRules), quotationController.previewEmails);

// Drafts can be saved at any wizard step and resumed later
router.post('/drafts', validate(draftPayloadRules), quotationController.createDraft);
router.put('/:quotationId/draft', validate([...quotationIdRules, ...draftPayloadRules]), quotationController.updateDraft);

// Complete a quotation (new, or from a draft via body.draftId): assigns a number and generates the PDF
router.post('/', validate(quotationPayloadRules), quotationController.create);

router.get('/:quotationId', validate(quotationIdRules), quotationController.getOne);
router.get('/:quotationId/email', validate(composeEmailRules), quotationController.composeEmail);
router.post('/:quotationId/send', validate(sendEmailRules), quotationController.send);

// Drafts: any admin. Completed quotations: super admin only (checked in the service)
router.delete('/:quotationId', validate(quotationIdRules), quotationController.remove);

module.exports = router;
