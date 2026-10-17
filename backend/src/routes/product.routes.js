const router = require('express').Router();
const productController = require('../controllers/product.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { productImageUpload, excelImportUpload } = require('../middlewares/upload.middleware');
const validate = require('../middlewares/validate.middleware');
const { ROLES } = require('../config/constants');
const { productIdRules, createProductRules, updateProductRules } = require('../validators/product.validator');

router.use(protect);

router.get('/', productController.list);
// Bulk import via Excel (must be declared before /:productId)
router.get('/import/template', productController.downloadTemplate);
router.post('/import', excelImportUpload, productController.importExcel);
router.post('/', productImageUpload, validate(createProductRules), productController.create);
router.get('/:productId', validate(productIdRules), productController.getOne);
router.patch('/:productId', productImageUpload, validate(updateProductRules), productController.update);
router.delete(
  '/:productId',
  authorize(ROLES.SUPER_ADMIN),
  validate(productIdRules),
  productController.remove
);

module.exports = router;
