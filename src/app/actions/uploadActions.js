'use server'

import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sanitizeHtml from 'sanitize-html'
import { safeParse } from 'valibot'

import { authorizeAction } from '@/libs/actionAuthorization'
import {
  createUploadFileSchema,
  FAVICON_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_FAVICON_SIZE_MB,
  MAX_GENERAL_UPLOAD_SIZE_MB,
  MAX_LOGO_SIZE_MB
} from '@/utils/validation/uploadSchemas'

const FILE_EXTENSIONS = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/webp': 'webp'
}

const MIME_ALIASES = {
  'image/ico': 'image/x-icon',
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/vnd.microsoft.icon': 'image/x-icon',
  'image/x-png': 'image/png'
}

const EXTENSION_MIME_TYPES = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
}

const SVG_ALLOWED_TAGS = [
  'circle',
  'clipPath',
  'defs',
  'desc',
  'ellipse',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  'filter',
  'g',
  'image',
  'line',
  'linearGradient',
  'marker',
  'mask',
  'metadata',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'stop',
  'style',
  'svg',
  'switch',
  'symbol',
  'text',
  'textPath',
  'title',
  'tspan',
  'use'
]

const SVG_ALLOWED_ATTRIBUTES = [
  'baseFrequency',
  'class',
  'clip-path',
  'clipPathUnits',
  'color',
  'cx',
  'cy',
  'd',
  'data-*',
  'dominant-baseline',
  'dx',
  'dy',
  'fill',
  'fill-opacity',
  'fill-rule',
  'filter',
  'filterUnits',
  'font-family',
  'font-size',
  'font-weight',
  'fr',
  'fx',
  'fy',
  'gradientTransform',
  'gradientUnits',
  'height',
  'href',
  'id',
  'in',
  'in2',
  'k1',
  'k2',
  'k3',
  'k4',
  'lengthAdjust',
  'marker-end',
  'marker-mid',
  'marker-start',
  'markerHeight',
  'markerUnits',
  'markerWidth',
  'maskContentUnits',
  'maskUnits',
  'mode',
  'numOctaves',
  'offset',
  'opacity',
  'operator',
  'orient',
  'patternContentUnits',
  'patternTransform',
  'patternUnits',
  'points',
  'preserveAspectRatio',
  'primitiveUnits',
  'r',
  'refX',
  'refY',
  'result',
  'rx',
  'ry',
  'seed',
  'spreadMethod',
  'stdDeviation',
  'stitchTiles',
  'stop-color',
  'stop-opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'style',
  'surfaceScale',
  'text-anchor',
  'textLength',
  'transform',
  'type',
  'values',
  'version',
  'viewBox',
  'width',
  'x',
  'x1',
  'x2',
  'xChannelSelector',
  'xlink:href',
  'xmlns',
  'xmlns:xlink',
  'y',
  'y1',
  'y2',
  'yChannelSelector'
]

const GENERAL_UPLOAD_PERMISSIONS = [
  'hrm:write',
  'projects:write',
  'contracts:write',
  'crm:write',
  'tasks:write',
  'finance:write',
  'options:write',
  'setup:manage',
  'settings:manage'
]

const UPLOAD_POLICIES = {
  favicon: {
    allowedMimeTypes: FAVICON_MIME_TYPES,
    directory: 'favicons',
    maxSizeMB: MAX_FAVICON_SIZE_MB,
    permissions: ['setup:manage', 'settings:manage']
  },
  image: {
    allowedMimeTypes: IMAGE_MIME_TYPES,
    directory: 'images',
    maxSizeMB: MAX_GENERAL_UPLOAD_SIZE_MB,
    permissions: GENERAL_UPLOAD_PERMISSIONS
  },
  logo: {
    allowedMimeTypes: IMAGE_MIME_TYPES,
    directory: 'logos',
    maxSizeMB: MAX_LOGO_SIZE_MB,
    permissions: ['setup:manage', 'settings:manage']
  },
  profile: {
    allowedMimeTypes: IMAGE_MIME_TYPES,
    directory: 'profiles',
    maxSizeMB: MAX_GENERAL_UPLOAD_SIZE_MB,
    permissions: []
  }
}

const getFormValue = (formData, key) => (formData?.get ? formData.get(key) : formData?.[key])

const isPng = buffer =>
  buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))

const isJpeg = buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff

const isGif = buffer => ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))

const isBmp = buffer => buffer.length >= 2 && buffer.toString('ascii', 0, 2) === 'BM'

const isWebp = buffer =>
  buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'

const isAvif = buffer =>
  buffer.length >= 12 &&
  buffer.toString('ascii', 4, 8) === 'ftyp' &&
  /avif|avis/.test(buffer.toString('ascii', 8, Math.min(buffer.length, 32)))

const isIcon = buffer =>
  buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00

const hasUnsafeCssReference = source => {
  if (/@import|-moz-binding|behavior\s*:|expression\s*\(/i.test(source)) return true

  return [...source.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gis)].some(([, , target]) => {
    const normalizedTarget = target.trim()

    return !normalizedTarget.startsWith('#') && !/^data:image\/(?:gif|jpe?g|png|webp);base64,/i.test(normalizedTarget)
  })
}

const hasUnsafeSvgReference = source =>
  [...source.matchAll(/(?:href|xlink:href)\s*=\s*(['"])(.*?)\1/gis)].some(([, , target]) => {
    const normalizedTarget = target.trim()

    return !normalizedTarget.startsWith('#') && !/^data:image\/(?:gif|jpe?g|png|webp);base64,/i.test(normalizedTarget)
  })

const sanitizeSvg = buffer => {
  const source = buffer
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trim()

  if (!/<svg(?:\s|>)/i.test(source) || /<!DOCTYPE|<!ENTITY/i.test(source)) return null
  if (hasUnsafeCssReference(source) || hasUnsafeSvgReference(source)) return null

  const sanitizedSource = sanitizeHtml(source, {
    allowProtocolRelative: false,
    allowVulnerableTags: true,
    allowedAttributes: { '*': SVG_ALLOWED_ATTRIBUTES },
    allowedSchemes: ['data'],
    allowedSchemesAppliedToAttributes: ['href', 'src', 'xlink:href'],
    allowedTags: SVG_ALLOWED_TAGS,
    parser: {
      lowerCaseAttributeNames: false,
      lowerCaseTags: false
    }
  }).trim()

  if (
    !/<svg(?:\s|>)/i.test(sanitizedSource) ||
    /<script|<foreignObject|\son\w+\s*=|javascript:/i.test(sanitizedSource)
  ) {
    return null
  }

  return Buffer.from(sanitizedSource, 'utf8')
}

const prepareFileBuffer = (buffer, mimeTypeValue) => {
  if (mimeTypeValue === 'image/avif' && isAvif(buffer)) return buffer
  if (mimeTypeValue === 'image/bmp' && isBmp(buffer)) return buffer
  if (mimeTypeValue === 'image/gif' && isGif(buffer)) return buffer
  if (mimeTypeValue === 'image/jpeg' && isJpeg(buffer)) return buffer
  if (mimeTypeValue === 'image/png' && isPng(buffer)) return buffer
  if (mimeTypeValue === 'image/webp' && isWebp(buffer)) return buffer
  if (mimeTypeValue === 'image/x-icon' && isIcon(buffer)) return buffer
  if (mimeTypeValue === 'image/svg+xml') return sanitizeSvg(buffer)

  return null
}

const normalizeMimeType = mimeTypeValue => MIME_ALIASES[mimeTypeValue] || mimeTypeValue

const resolveMimeType = (uploadedFile, policy) => {
  const reportedMimeType = uploadedFile.type?.trim().toLowerCase()
  const normalizedReportedMimeType = normalizeMimeType(reportedMimeType)
  const allowedMimeTypes = policy.allowedMimeTypes.map(normalizeMimeType)

  if (reportedMimeType && reportedMimeType !== 'application/octet-stream') {
    return allowedMimeTypes.includes(normalizedReportedMimeType) ? normalizedReportedMimeType : null
  }

  const inferredMimeType = EXTENSION_MIME_TYPES[path.extname(uploadedFile.name || '').toLowerCase()]

  return inferredMimeType && allowedMimeTypes.includes(inferredMimeType) ? inferredMimeType : null
}

const failure = (code, error) => ({ success: false, code, error })

export const uploadFileAction = async formData => {
  const uploadType = getFormValue(formData, 'uploadType') || 'image'
  const policy = UPLOAD_POLICIES[uploadType]

  if (!policy) return failure('INVALID_UPLOAD_TYPE', 'This upload type is not supported.')

  const authorization = await authorizeAction(policy.permissions)

  if (!authorization.authorized) {
    return failure(authorization.code, authorization.error)
  }

  const uploadedFile = getFormValue(formData, 'file')

  if (!uploadedFile || uploadedFile.size === 0) {
    return failure('INVALID_FILE', 'Select a file to upload.')
  }

  const resolvedMimeType = resolveMimeType(uploadedFile, policy)

  if (!resolvedMimeType) {
    return failure('UNSUPPORTED_FILE_TYPE', 'This file type is not supported.')
  }

  if (uploadedFile.size > policy.maxSizeMB * 1024 * 1024) {
    return failure('FILE_TOO_LARGE', `The file must not exceed ${policy.maxSizeMB} MB.`)
  }

  const validation = safeParse(
    createUploadFileSchema({
      allowedMimeTypes: [...policy.allowedMimeTypes, uploadedFile.type],
      maxSizeMB: policy.maxSizeMB
    }),
    uploadedFile
  )

  if (!validation.success) {
    return failure('INVALID_FILE', validation.issues?.[0]?.message || 'The selected file is invalid.')
  }

  try {
    const buffer = Buffer.from(await validation.output.arrayBuffer())
    const safeBuffer = prepareFileBuffer(buffer, resolvedMimeType)

    if (!safeBuffer) {
      return failure('UNSAFE_FILE', 'The file content does not match a safe supported image.')
    }

    const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads')
    const targetDirectory = path.resolve(uploadsRoot, policy.directory)

    if (!targetDirectory.startsWith(`${uploadsRoot}${path.sep}`)) {
      return failure('INVALID_UPLOAD_PATH', 'The upload destination is invalid.')
    }

    await mkdir(targetDirectory, { recursive: true })

    const extension = FILE_EXTENSIONS[resolvedMimeType]
    const filename = `${Date.now()}-${randomUUID()}.${extension}`
    const filePath = path.join(targetDirectory, filename)

    await writeFile(filePath, safeBuffer, { flag: 'wx' })

    const url = path.posix.join('/uploads', policy.directory, filename)

    return { success: true, url, data: { url } }
  } catch {
    return failure('UPLOAD_FAILED', 'The file could not be uploaded. Please try again.')
  }
}
