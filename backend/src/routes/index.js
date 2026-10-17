const router = require('express').Router();
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const companyRoutes = require('./company.routes');
const termRoutes = require('./term.routes');
const productRoutes = require('./product.routes');
const quotationRoutes = require('./quotation.routes');
const emailTemplateRoutes = require('./emailTemplate.routes');
const dashboardRoutes = require('./dashboard.routes');

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/admins', adminRoutes);
router.use('/companies', companyRoutes);
router.use('/terms', termRoutes);
router.use('/products', productRoutes);
router.use('/quotations', quotationRoutes);
router.use('/email-templates', emailTemplateRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
