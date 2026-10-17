// Mounted at /api/companies/:companyId/members (auth applied by the parent router)
const router = require('express').Router({ mergeParams: true });
const memberController = require('../controllers/companyEmployee.controller');
const validate = require('../middlewares/validate.middleware');
const { excelImportUpload } = require('../middlewares/upload.middleware');
const {
  companyIdRules,
  memberIdRules,
  createMemberRules,
  updateMemberRules,
} = require('../validators/company.validator');

router.get('/', validate(companyIdRules), memberController.list);
router.post('/', validate(createMemberRules), memberController.create);
// Bulk import via Excel (must be declared before /:memberId)
router.get('/import/template', validate(companyIdRules), memberController.downloadTemplate);
router.post('/import', excelImportUpload, validate(companyIdRules), memberController.importExcel);
router.get('/:memberId', validate(memberIdRules), memberController.getOne);
router.patch('/:memberId', validate(updateMemberRules), memberController.update);
router.delete('/:memberId', validate(memberIdRules), memberController.remove);

module.exports = router;
