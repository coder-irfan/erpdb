'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

// Server Action Imports
import { uploadFileAction } from '@/app/actions/uploadActions'

const DEFAULT_ACCEPT = {
  'image/avif': ['.avif'],
  'image/bmp': ['.bmp'],
  'image/gif': ['.gif'],
  'image/ico': ['.ico'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/jpg': ['.jpg'],
  'image/png': ['.png'],
  'image/svg+xml': ['.svg'],
  'image/vnd.microsoft.icon': ['.ico'],
  'image/webp': ['.webp'],
  'image/x-icon': ['.ico']
}

const DEFAULT_TRANSLATIONS = {
  browse: 'Browse Image',
  drop: 'Drag and drop an image here, or browse files.',
  fileHint: 'PNG, JPEG, WebP, or SVG up to {maxSizeMB} MB',
  forbidden: 'You do not have permission to upload this file.',
  invalidFile: 'Select a valid image file.',
  previewAlt: 'Uploaded image preview',
  remove: 'Remove',
  replace: 'Replace',
  tooLarge: 'The image must not exceed {maxSizeMB} MB.',
  unauthenticated: 'Sign in before uploading files.',
  unsafeFile: 'The selected image did not pass the security check.',
  unsupportedType: 'Only PNG, JPEG, WebP, and SVG images are supported.',
  uploadFailed: 'The image could not be uploaded. Please try again.',
  uploading: 'Uploading...'
}

const interpolate = (message, values) =>
  Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), message)

const normalizeAccept = accept => {
  if (!accept) return DEFAULT_ACCEPT
  if (typeof accept !== 'string') return accept

  return Object.fromEntries(
    accept
      .split(',')
      .map(value => value.trim())
      .filter(value => value.includes('/'))
      .map(mime => [mime, []])
  )
}

const FileUpload = ({
  value,
  onChange,
  label,
  accept,
  maxSizeMB = 4,
  previewHeight = 180,
  uploadType = 'image',
  translations = DEFAULT_TRANSLATIONS
}) => {
  const copy = { ...DEFAULT_TRANSLATIONS, ...translations }
  const normalizedMaxSizeMB = Math.min(Math.max(Number(maxSizeMB) || 1, 1), 4)
  const normalizedAccept = useMemo(() => normalizeAccept(accept), [accept])
  const [isUploading, setIsUploading] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null)
  const previewUrl = localPreviewUrl || value

  useEffect(
    () => () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    },
    [localPreviewUrl]
  )

  const getErrorMessage = code => {
    const messages = {
      FILE_TOO_LARGE: interpolate(copy.tooLarge, { maxSizeMB: normalizedMaxSizeMB }),
      FORBIDDEN: copy.forbidden,
      INVALID_FILE: copy.invalidFile,
      UNAUTHENTICATED: copy.unauthenticated,
      UNSAFE_FILE: copy.unsafeFile,
      UNSUPPORTED_FILE_TYPE: copy.unsupportedType,
      UPLOAD_FAILED: copy.uploadFailed
    }

    return messages[code] || copy.uploadFailed
  }

  const handleDrop = async acceptedFiles => {
    const selectedFile = acceptedFiles[0]

    if (!selectedFile) return

    const objectUrl = URL.createObjectURL(selectedFile)

    setLocalPreviewUrl(objectUrl)
    setIsUploading(true)

    const formData = new FormData()

    formData.set('file', selectedFile)
    formData.set('uploadType', uploadType)

    let result

    try {
      result = await uploadFileAction(formData)
    } catch {
      result = { success: false, code: 'UPLOAD_FAILED' }
    } finally {
      setIsUploading(false)
    }

    if (!result.success) {
      setLocalPreviewUrl(null)
      toast.error(getErrorMessage(result.code))

      return
    }

    onChange?.(result.url)
    setLocalPreviewUrl(null)
  }

  const handleRejectedFiles = rejectedFiles => {
    const errorCode = rejectedFiles[0]?.errors?.[0]?.code

    toast.error(
      errorCode === 'file-too-large'
        ? interpolate(copy.tooLarge, { maxSizeMB: normalizedMaxSizeMB })
        : copy.unsupportedType
    )
  }

  const { getInputProps, getRootProps, isDragActive, open } = useDropzone({
    accept: normalizedAccept,
    disabled: isUploading,
    maxFiles: 1,
    maxSize: normalizedMaxSizeMB * 1024 * 1024,
    multiple: false,
    noClick: true,
    onDrop: handleDrop,
    onDropRejected: handleRejectedFiles
  })

  return (
    <div className='flex flex-col gap-3'>
      <Typography variant='h6'>{label}</Typography>
      <div
        {...getRootProps()}
        className={`relative flex items-center justify-center overflow-hidden rounded border-2 border-dashed bg-actionHover p-4 text-center transition-colors ${isDragActive ? 'border-primary' : 'border-divider'}`}
        style={{ minHeight: previewHeight }}
      >
        <input {...getInputProps()} />
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={copy.previewAlt}
            className='max-is-full object-contain'
            style={{ maxHeight: previewHeight - 32 }}
          />
        ) : (
          <div className='flex flex-col items-center gap-2'>
            <i className='tabler-cloud-upload text-4xl text-primary' />
            <Typography>{copy.drop}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {interpolate(copy.fileHint, { maxSizeMB: normalizedMaxSizeMB })}
            </Typography>
          </div>
        )}
        {isUploading && (
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 bg-backgroundPaper/80'>
            <CircularProgress size={28} />
            <Typography variant='body2'>{copy.uploading}</Typography>
          </div>
        )}
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          variant={value ? 'tonal' : 'contained'}
          onClick={open}
          disabled={isUploading}
          startIcon={<i className='tabler-upload' />}
        >
          {value ? copy.replace : copy.browse}
        </Button>
        {value && (
          <Button
            type='button'
            color='error'
            variant='tonal'
            onClick={() => onChange?.(null)}
            disabled={isUploading}
            startIcon={<i className='tabler-trash' />}
          >
            {copy.remove}
          </Button>
        )}
      </div>
    </div>
  )
}

export default FileUpload
