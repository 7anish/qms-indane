import client from "./client"

// Create/update send multipart/form-data (the product image is an uploaded file)
export const productApi = {
  list: (params) => client.get("/products", { params }),
  get: (id) => client.get(`/products/${id}`),
  create: (formData) => client.post("/products", formData),
  update: (id, formData) => client.patch(`/products/${id}`, formData),
  remove: (id) => client.delete(`/products/${id}`),
  downloadTemplate: () => client.get("/products/import/template", { responseType: "blob" }),
  importExcel: (file) => {
    const fd = new FormData()
    fd.append("file", file)
    return client.post("/products/import", fd)
  },
}
