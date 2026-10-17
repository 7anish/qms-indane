import client from "./client"

export const quotationApi = {
  list: (params) => client.get("/quotations", { params }),
  // Companies with their quotation counts (Company Quotations page)
  companySummaries: (params) => client.get("/quotations/companies", { params }),
  get: (id) => client.get(`/quotations/${id}`),
  // Returns a PDF Blob for unsaved wizard data
  preview: (payload) => client.post("/quotations/preview", payload, { responseType: "blob" }),
  // The email each recipient will get, for unsaved wizard data
  previewEmails: (payload) => client.post("/quotations/email-preview", payload),
  // Drafts can be partial; completing one (create with draftId) assigns the number and PDF
  createDraft: (payload) => client.post("/quotations/drafts", payload),
  updateDraft: (id, payload) => client.put(`/quotations/${id}/draft`, payload),
  create: (payload) => client.post("/quotations", payload),
  // The email rendered with a template (default: the quotation's own template)
  composeEmail: (id, templateId) => client.get(`/quotations/${id}/email`, { params: { templateId: templateId || undefined } }),
  recentCopyAddresses: () => client.get("/quotations/recent-copy-addresses"),
  send: (id, payload) => client.post(`/quotations/${id}/send`, payload),
  remove: (id) => client.delete(`/quotations/${id}`),
}
