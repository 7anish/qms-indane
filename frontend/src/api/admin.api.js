import client from "./client"

export const adminApi = {
  list: (params) => client.get("/admins", { params }),
  stats: () => client.get("/admins/stats"),
  get: (id) => client.get(`/admins/${id}`),
  create: (payload) => client.post("/admins", payload),
  update: (id, payload) => client.patch(`/admins/${id}`, payload),
  remove: (id) => client.delete(`/admins/${id}`),
}
