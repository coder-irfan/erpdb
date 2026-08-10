import { file, maxSize, mimeType, pipe } from 'valibot'

export const IMAGE_MIME_TYPES = [
  'image/avif',
  'image/bmp',
  'image/gif',
  'image/ico',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/svg+xml',
  'image/vnd.microsoft.icon',
  'image/webp',
  'image/x-icon',
  'image/x-png'
]
export const FAVICON_MIME_TYPES = [
  'image/ico',
  'image/png',
  'image/svg+xml',
  'image/vnd.microsoft.icon',
  'image/x-icon',
  'image/x-png'
]
export const MAX_FAVICON_SIZE_MB = 1
export const MAX_LOGO_SIZE_MB = 2
export const MAX_GENERAL_UPLOAD_SIZE_MB = 4

export const createUploadFileSchema = ({
  allowedMimeTypes = IMAGE_MIME_TYPES,
  maxSizeMB = MAX_GENERAL_UPLOAD_SIZE_MB
} = {}) => {
  const normalizedMaxSizeMB = Math.min(Math.max(Number(maxSizeMB) || 1, 1), MAX_GENERAL_UPLOAD_SIZE_MB)

  return pipe(
    file('Select a valid file.'),
    mimeType(allowedMimeTypes, 'This file type is not supported.'),
    maxSize(normalizedMaxSizeMB * 1024 * 1024, `The file must not exceed ${normalizedMaxSizeMB} MB.`)
  )
}

export const logoUploadSchema = createUploadFileSchema({ maxSizeMB: MAX_LOGO_SIZE_MB })
export const faviconUploadSchema = createUploadFileSchema({
  allowedMimeTypes: FAVICON_MIME_TYPES,
  maxSizeMB: MAX_FAVICON_SIZE_MB
})
export const imageUploadSchema = createUploadFileSchema()
