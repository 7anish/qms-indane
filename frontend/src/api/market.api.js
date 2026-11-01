import client from "./client"

// Create/update send multipart/form-data (the rate images are uploaded files)
export const marketApi = {
  list: (params) => client.get("/markets", { params }),
  get: (id) => client.get(`/markets/${id}`),
  create: (formData) => client.post("/markets", formData),
  update: (id, formData) => client.patch(`/markets/${id}`, formData),
  remove: (id) => client.delete(`/markets/${id}`),
}
