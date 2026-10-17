export const APP_NAME = "QMS"

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
}

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
}

export const TOKEN_KEY = "qms_token"

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // must match backend/src/config/upload.js

export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

export const ACCEPT = {
  DOC: "application/pdf,image/jpeg,image/png",
  IMAGE: "image/jpeg,image/png,image/webp",
}
