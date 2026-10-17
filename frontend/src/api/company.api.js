import client from "./client"

// Company create/update send multipart/form-data (documents are uploaded files)
export const companyApi = {
  list: (params) => client.get("/companies", { params }),
  stats: () => client.get("/companies/stats"),
  get: (id) => client.get(`/companies/${id}`),
  create: (formData) => client.post("/companies", formData),
  update: (id, formData) => client.patch(`/companies/${id}`, formData),
  remove: (id) => client.delete(`/companies/${id}`),
  downloadTemplate: () => client.get("/companies/import/template", { responseType: "blob" }),
  importExcel: (file) => {
    const fd = new FormData()
    fd.append("file", file)
    return client.post("/companies/import", fd)
  },
}

export const memberApi = {
  list: (companyId, params) => client.get(`/companies/${companyId}/members`, { params }),
  create: (companyId, payload) => client.post(`/companies/${companyId}/members`, payload),
  update: (companyId, memberId, payload) => client.patch(`/companies/${companyId}/members/${memberId}`, payload),
  remove: (companyId, memberId) => client.delete(`/companies/${companyId}/members/${memberId}`),
  downloadTemplate: (companyId) =>
    client.get(`/companies/${companyId}/members/import/template`, { responseType: "blob" }),
  importExcel: (companyId, file) => {
    const fd = new FormData()
    fd.append("file", file)
    return client.post(`/companies/${companyId}/members/import`, fd)
  },
}
