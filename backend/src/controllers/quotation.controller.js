const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const quotationService = require('../services/quotation.service');
const { isMailConfigured, isMock } = require('../services/mail.service');

// Renders the PDF for unsaved wizard data and streams it back (nothing is stored)
const preview = asyncHandler(async (req, res) => {
  const buffer = await quotationService.previewPdf(req.body);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="quotation-preview.pdf"');
  res.send(buffer);
});

// Emails each recipient will receive, for unsaved wizard data (nothing is stored or sent)
const previewEmails = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await quotationService.previewEmails(req.body, req.admin));
});

// Companies with their quotation counts (Company Quotations page)
const companySummaries = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await quotationService.companySummaries(req.query));
});

const list = asyncHandler(async (req, res) => {
  const result = await quotationService.listQuotations(req.query);
  sendResponse(res, 200, result);
});

const getOne = asyncHandler(async (req, res) => {
  const quotation = await quotationService.getQuotationById(req.params.quotationId);
  sendResponse(res, 200, quotation);
});

const createDraft = asyncHandler(async (req, res) => {
  const quotation = await quotationService.saveDraft(req.body, req.admin._id);
  sendResponse(res, 201, quotation, 'Draft saved');
});

const updateDraft = asyncHandler(async (req, res) => {
  const quotation = await quotationService.saveDraft(req.body, req.admin._id, req.params.quotationId);
  sendResponse(res, 200, quotation, 'Draft saved');
});

const create = asyncHandler(async (req, res) => {
  const quotation = await quotationService.createQuotation(req.body, req.admin._id);
  sendResponse(res, 201, quotation, `Quotation ${quotation.quotationNumber} created`);
});

// The email rendered with a template (?templateId=, default: the quotation's template), for the send dialog
const composeEmail = asyncHandler(async (req, res) => {
  const email = await quotationService.composeEmail(req.params.quotationId, req.admin, req.query.templateId);
  sendResponse(res, 200, { ...email, mailConfigured: isMailConfigured(), mockMode: isMock() });
});

// Recently used CC / BCC addresses for suggestions
const recentCopyAddresses = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await quotationService.recentCopyAddresses());
});

const send = asyncHandler(async (req, res) => {
  const result = await quotationService.sendQuotationEmail(req.params.quotationId, req.body, req.admin);
  const n = result.sentTo.length;
  const plural = n === 1 ? '' : 's';
  let msg =
    result.mode === 'mock'
      ? `Mock mode: ${n} email${plural} (one per recipient) saved to backend/outbox, not delivered`
      : `Sent ${n} email${plural}, one to each recipient: ${result.sentTo.join(', ')}`;
  if (result.failed.length) msg += `. Failed: ${result.failed.map((x) => `${x.email} (${x.error})`).join('; ')}`;
  sendResponse(res, 200, { quotation: result.quotation, mode: result.mode, sentTo: result.sentTo, failed: result.failed }, msg);
});

const remove = asyncHandler(async (req, res) => {
  await quotationService.deleteQuotation(req.params.quotationId, req.admin);
  sendResponse(res, 200, null, 'Quotation deleted');
});

module.exports = { preview, previewEmails, companySummaries, list, getOne, createDraft, updateDraft, create, composeEmail, recentCopyAddresses, send, remove };
