'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { toast } from 'sonner'

// Component Imports
import FileUpload from '@/components/common/FileUpload'
import LoadingButtonContent from '@/components/LoadingButtonContent'

// Server Action Imports
import { updateLogoSettings } from '@/app/actions/settingActions'

const LOGO_ACCEPT =
  'image/avif,image/bmp,image/gif,image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon'

const FAVICON_ACCEPT = {
  'image/ico': ['.ico'],
  'image/png': ['.png'],
  'image/svg+xml': ['.svg'],
  'image/vnd.microsoft.icon': ['.ico'],
  'image/x-icon': ['.ico']
}

const SetupView = ({ dictionary, initialSettings, locale }) => {
  const router = useRouter()
  const [lightLogoUrl, setLightLogoUrl] = useState(initialSettings.lightLogoUrl)
  const [darkLogoUrl, setDarkLogoUrl] = useState(initialSettings.darkLogoUrl)
  const [faviconUrl, setFaviconUrl] = useState(initialSettings.faviconUrl)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)

    let result

    try {
      result = await updateLogoSettings({ lightLogoUrl, darkLogoUrl, faviconUrl, locale })
    } catch {
      result = { success: false, error: dictionary.saveFailed }
    } finally {
      setIsSaving(false)
    }

    if (!result.success) {
      toast.error(result.error)

      return
    }

    setLightLogoUrl(result.data.lightLogoUrl)
    setDarkLogoUrl(result.data.darkLogoUrl)
    setFaviconUrl(result.data.faviconUrl)
    toast.success(result.message)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader title={dictionary.title} subheader={dictionary.description} />
      <Divider />
      <CardContent className='flex flex-col gap-8'>
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3'>
          <div className='flex flex-col gap-3'>
            <FileUpload
              value={lightLogoUrl}
              onChange={setLightLogoUrl}
              label={dictionary.lightLogo}
              accept={LOGO_ACCEPT}
              maxSizeMB={2}
              previewHeight={200}
              uploadType='logo'
              translations={dictionary.upload}
            />
            <Typography variant='body2' color='text.secondary'>
              {dictionary.lightLogoDescription}
            </Typography>
          </div>
          <div className='flex flex-col gap-3'>
            <FileUpload
              value={darkLogoUrl}
              onChange={setDarkLogoUrl}
              label={dictionary.darkLogo}
              accept={LOGO_ACCEPT}
              maxSizeMB={2}
              previewHeight={200}
              uploadType='logo'
              translations={dictionary.upload}
            />
            <Typography variant='body2' color='text.secondary'>
              {dictionary.darkLogoDescription}
            </Typography>
          </div>
          <div className='flex flex-col gap-3'>
            <FileUpload
              value={faviconUrl}
              onChange={setFaviconUrl}
              label={dictionary.favicon}
              accept={FAVICON_ACCEPT}
              maxSizeMB={1}
              previewHeight={200}
              uploadType='favicon'
              translations={{
                ...dictionary.upload,
                fileHint: dictionary.faviconFileHint,
                previewAlt: dictionary.faviconPreviewAlt,
                unsupportedType: dictionary.faviconUnsupportedType
              }}
            />
            <Typography variant='body2' color='text.secondary'>
              {dictionary.faviconDescription}
            </Typography>
          </div>
        </div>
        <div className='flex justify-end'>
          <Button variant='contained' onClick={handleSave} disabled={isSaving}>
            <LoadingButtonContent loading={isSaving} loadingLabel={dictionary.saving}>
              {dictionary.save}
            </LoadingButtonContent>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default SetupView
