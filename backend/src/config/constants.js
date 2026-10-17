const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
});

const ADMIN_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

const COMPANY_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

const PRODUCT_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

const QUOTATION_STATUS = Object.freeze({
  DRAFT: 'draft', // work in progress: partial data, no number, no PDF
  READY: 'ready', // completed: numbered, PDF generated
  SENT: 'sent', // emailed to the recipients at least once
});

const GST_MODE = Object.freeze({
  EXCLUDED: 'excluded', // prices are before GST; GST is added on top
  INCLUDED: 'included', // prices already contain GST; GST is extracted
});

const DEFAULT_GST_RATE = 18;

// Indian GSTIN, e.g. 27ABCDE1234F1Z5
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
// Indian PAN, e.g. ABCDE1234F
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

// Company document fields that accept file uploads
const COMPANY_FILE_FIELDS = Object.freeze([
  'gstCertificate',
  'panFront',
  'panBack',
  'msmeCertificate',
]);

module.exports = {
  ROLES,
  ADMIN_STATUS,
  COMPANY_STATUS,
  PRODUCT_STATUS,
  QUOTATION_STATUS,
  GST_MODE,
  DEFAULT_GST_RATE,
  GST_REGEX,
  PAN_REGEX,
  COMPANY_FILE_FIELDS,
};
