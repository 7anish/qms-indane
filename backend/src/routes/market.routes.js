const router = require('express').Router();
const marketController = require('../controllers/market.controller');
const { protect } = require('../middlewares/auth.middleware');
const { marketImagesUpload } = require('../middlewares/upload.middleware');
const validate = require('../middlewares/validate.middleware');
const { marketIdRules, createMarketRules, updateMarketRules } = require('../validators/market.validator');

// Any logged-in admin can manage markets and their monthly rate images
router.use(protect);

router.get('/', marketController.list);
router.post('/', marketImagesUpload, validate(createMarketRules), marketController.create);
router.get('/:marketId', validate(marketIdRules), marketController.getOne);
router.patch('/:marketId', marketImagesUpload, validate(updateMarketRules), marketController.update);
router.delete('/:marketId', validate(marketIdRules), marketController.remove);

module.exports = router;
