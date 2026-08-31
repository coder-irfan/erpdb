const normalizeBasePath = value => {
  const path = String(value || '').trim()

  if (!path || path === '/') return ''

  return `/${path.replace(/^\/+|\/+$/g, '')}`
}

export const resolveUploadUrl = value => {
  const rawValue = String(value || '').trim()

  if (!rawValue) return ''
  if (/^(?:blob:|data:|https?:\/\/)/i.test(rawValue)) return rawValue

  const normalizedValue = rawValue.replaceAll('\\', '/')
  const uploadsIndex = normalizedValue.toLowerCase().indexOf('/uploads/')
  const publicPath = uploadsIndex >= 0 ? normalizedValue.slice(uploadsIndex) : `/${normalizedValue.replace(/^\/+/, '')}`
  const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)

  if (!basePath || publicPath === basePath || publicPath.startsWith(`${basePath}/`)) return publicPath

  return `${basePath}${publicPath}`
}

export const isImageUpload = value =>
  /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(resolveUploadUrl(value))
