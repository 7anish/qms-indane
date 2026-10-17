const router = require('express').Router();
const companyController = require('../controllers/company.controller');
const memberRoutes = require('./companyEmployee.routes');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { companyDocsUpload, excelImportUpload } = require('../middlewares/upload.middleware');
const validate = require('../middlewares/validate.middleware');
const { ROLES } = require('../config/constants');
const {
  companyIdRules,
  createCompanyRules,
  updateCompanyRules,
} = require('../validators/company.validator');

router.use(protect);

router.get('/stats', companyController.stats);
// Bulk import via Excel (must be declared before /:companyId)
router.get('/import/template', companyController.downloadTemplate);
router.post('/import', excelImportUpload, companyController.importExcel);
router.get('/', companyController.list);
router.post('/', companyDocsUpload, validate(createCompanyRules), companyController.create);

router.get('/:companyId', validate(companyIdRules), companyController.getOne);
router.patch('/:companyId', companyDocsUpload, validate(updateCompanyRules), companyController.update);
router.delete(
  '/:companyId',
  authorize(ROLES.SUPER_ADMIN),
  validate(companyIdRules),
  companyController.remove
);

router.use('/:companyId/members', memberRoutes);

module.exports = router;
