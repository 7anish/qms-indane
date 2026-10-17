import client from "./client"

export const termApi = {
  list: (params) => client.get("/terms", { params }),
  get: (id) => client.get(`/terms/${id}`),
  create: (payload) => client.post("/terms", payload),
  update: (id, payload) => client.patch(`/terms/${id}`, payload),
  remove: (id) => client.delete(`/terms/${id}`),
}
