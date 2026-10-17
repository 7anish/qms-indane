import client from "./client"

export const emailTemplateApi = {
  variables: () => client.get("/email-templates/variables"),
  list: (params) => client.get("/email-templates", { params }),
  get: (id) => client.get(`/email-templates/${id}`),
  create: (payload) => client.post("/email-templates", payload),
  update: (id, payload) => client.patch(`/email-templates/${id}`, payload),
  remove: (id) => client.delete(`/email-templates/${id}`),
}
