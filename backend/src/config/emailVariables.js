/*
 * Variables available in email template subjects and bodies, written as {{name}}.
 * `sample` is shown in the template editor preview.
 */
const EMAIL_VARIABLES = Object.freeze([
  { name: 'companyName', label: 'Company name', sample: 'Acme Industries Pvt Ltd' },
  { name: 'companyAddress', label: 'Company address', sample: '12 MG Road, Pune 411001' },
  { name: 'companyGstNumber', label: 'Company GST number', sample: '27ABCDE1234F1Z5' },
  { name: 'quotationNumber', label: 'Quotation number', sample: 'QT-2026-0001' },
  { name: 'quotationDate', label: 'Quotation date', sample: '17 Oct 2026' },
  { name: 'rateMonth', label: 'Rates month', sample: 'October 2026' },
  { name: 'products', label: 'Product names', sample: 'Liquid Oxygen, Nitrogen Cylinder' },
  { name: 'securityDeposit', label: 'Security deposit', sample: 'Rs. 25,000.00' },
  // Rendered as a styled table in HTML emails and as lines of text in plain-text emails
  { name: 'pricingTable', label: 'Pricing table', sample: '(pricing table)' },
  // Each recipient gets a separate email, so this is the name of the person that email goes to
  { name: 'recipientName', label: 'Recipient name', sample: 'Ravi Sharma' },
  { name: 'senderName', label: 'Your name', sample: 'Super Admin' },
  { name: 'senderEmail', label: 'Your email', sample: 'admin@qms.com' },
]);

const VARIABLE_NAMES = new Set(EMAIL_VARIABLES.map((v) => v.name));

const EMAIL_FORMAT = Object.freeze({ TEXT: 'text', HTML: 'html' });

// Quotation used to render {{pricingTable}} in template previews (the example rate sheet)
const SAMPLE_QUOTATION = Object.freeze({
  rateMonth: '2026-10',
  basicLabel: 'BASIC BY IOCL',
  gstMode: 'excluded',
  gstRate: 18,
  items: [
    { name: 'Liquid Oxygen', capacityKg: 425, basicPrice: 54454.66, discount: 5217.8, taxableValue: 49236.86, gstAmount: 8862.63, total: 58099.49, landedCostPerKg: 115.85 },
    { name: 'Nitrogen Cylinder', capacityKg: 7, basicPrice: 1000, discount: 50, taxableValue: 950, gstAmount: 171, total: 1121, landedCostPerKg: 135.71 },
  ],
});

// Used when a quotation has no template selected (or its template was deleted)
const BUILT_IN_TEMPLATE = Object.freeze({
  name: 'Built-in default',
  format: EMAIL_FORMAT.TEXT,
  subject: 'Quotation {{quotationNumber}} - Rates for {{rateMonth}}',
  body: [
    'Dear {{recipientName}},',
    '',
    'Please find attached our quotation {{quotationNumber}} with rates for the month of {{rateMonth}}.',
    '',
    'Kindly review it and let us know if you have any questions.',
    '',
    'Regards,',
    '{{senderName}}',
  ].join('\n'),
  cc: [],
  bcc: [],
});

module.exports = { EMAIL_VARIABLES, VARIABLE_NAMES, EMAIL_FORMAT, SAMPLE_QUOTATION, BUILT_IN_TEMPLATE };
