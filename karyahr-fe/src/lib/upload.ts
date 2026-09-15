const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx'

export const FILE_TYPE_NOT_ALLOWED = 'File type is not allowed'

/**
 * Returns whether the file's declared MIME type is on the backend allowlist.
 */
export function isAllowedUpload(file: File): boolean {
  const normalized = file.type.split(';')[0]?.trim().toLowerCase() ?? ''
  return ALLOWED_CONTENT_TYPES.has(normalized)
}
