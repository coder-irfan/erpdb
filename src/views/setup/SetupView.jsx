'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import FileUpload from '@/components/common/FileUpload'
import LoadingButtonContent from '@/components/LoadingButtonContent'

const LOGO_ACCEPT =
  'image/avif,image/bmp,image/gif,image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon'

const FAVICON_ACCEPT = {
  'image/ico': ['.ico'],
  'image/png': ['.png'],
  'image/svg+xml': ['.svg'],
  'image/vnd.microsoft.icon': ['.ico'],
  'image/x-icon': ['.ico']
}

const getInitialForm = settings => ({
  app_name: settings.app_name || 'ERP System',
  company_name: settings.company_name || '',
  company_email: settings.company_email || '',
  company_phone: settings.company_phone || '',
  company_address: settings.company_address || '',
  company_tax_id: settings.company_tax_id || '',
  signatory_name: settings.signatory_name || '',
  signatory_title: settings.signatory_title || '',
  default_work_start: settings.default_work_start || '08:30',
  default_work_end: settings.default_work_end || '17:30'
})

const SetupView = ({ dictionary, initialSettings, locale }) => {
  const router = useRouter()
  const [form, setForm] = useState(() => getInitialForm(initialSettings))
  const [companyLogo, setCompanyLogo] = useState(initialSettings.company_logo)
  const [signatoryStamp, setSignatoryStamp] = useState(initialSettings.signatory_stamp)
  const [lightLogoUrl, setLightLogoUrl] = useState(initialSettings.lightLogoUrl)
  const [darkLogoUrl, setDarkLogoUrl] = useState(initialSettings.darkLogoUrl)
  const [faviconUrl, setFaviconUrl] = useState(initialSettings.faviconUrl)
  const [isSaving, setIsSaving] = useState(false)

  const updateField = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast.error(dictionary.validation.companyNameRequired)

      return
    }

    if (form.default_work_end <= form.default_work_start) {
      toast.error(dictionary.validation.workEndAfterStart)

      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          company_logo: companyLogo,
          signatory_stamp: signatoryStamp,
          lightLogoUrl,
          darkLogoUrl,
          faviconUrl,
          locale
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || dictionary.saveFailed)

        return
      }

      setForm(getInitialForm(result.data))
      setCompanyLogo(result.data.company_logo)
      setSignatoryStamp(result.data.signatory_stamp)
      setLightLogoUrl(result.data.lightLogoUrl)
      setDarkLogoUrl(result.data.darkLogoUrl)
      setFaviconUrl(result.data.faviconUrl)
      toast.success(dictionary.saved)
      router.refresh()
    } catch {
      toast.error(dictionary.saveFailed)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      <Card>
        <CardHeader title={dictionary.letterheadTitle} subheader={dictionary.letterheadDescription} />
        <Divider />
        <CardContent className='flex flex-col gap-8'>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            <CustomTextField
              fullWidth
              required
              name='company_name'
              label={dictionary.fields.companyName}
              value={form.company_name}
              onChange={updateField}
            />
            <CustomTextField
              fullWidth
              name='app_name'
              label={dictionary.fields.appName}
              value={form.app_name}
              onChange={updateField}
            />
            <CustomTextField
              fullWidth
              type='email'
              name='company_email'
              label={dictionary.fields.companyEmail}
              value={form.company_email}
              onChange={updateField}
            />
            <CustomTextField
              fullWidth
              name='company_phone'
              label={dictionary.fields.companyPhone}
              value={form.company_phone}
              onChange={updateField}
            />
            <CustomTextField
              fullWidth
              name='company_tax_id'
              label={dictionary.fields.companyTaxId}
              value={form.company_tax_id}
              onChange={updateField}
            />
            <CustomTextField
              fullWidth
              name='signatory_name'
              label={dictionary.fields.signatoryName}
              value={form.signatory_name}
              onChange={updateField}
            />
            <CustomTextField
              fullWidth
              name='signatory_title'
              label={dictionary.fields.signatoryTitle}
              value={form.signatory_title}
              onChange={updateField}
            />
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              name='company_address'
              label={dictionary.fields.companyAddress}
              value={form.company_address}
              onChange={updateField}
            />
          </div>
          <div className='rounded border p-5'>
            <Typography variant='h6'>{dictionary.workHoursTitle}</Typography>
            <Typography variant='body2' color='text.secondary' className='mb-5'>
              {dictionary.workHoursDescription}
            </Typography>
            <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
              <CustomTextField
                fullWidth
                required
                type='time'
                name='default_work_start'
                label={dictionary.fields.workStart}
                value={form.default_work_start}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={updateField}
              />
              <CustomTextField
                fullWidth
                required
                type='time'
                name='default_work_end'
                label={dictionary.fields.workEnd}
                value={form.default_work_end}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={updateField}
              />
            </div>
          </div>
          <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
            <FileUpload
              value={companyLogo}
              onChange={setCompanyLogo}
              label={dictionary.companyLogo}
              accept={LOGO_ACCEPT}
              maxSizeMB={2}
              previewHeight={180}
              uploadType='logo'
              translations={dictionary.upload}
            />
            <FileUpload
              value={signatoryStamp}
              onChange={setSignatoryStamp}
              label={dictionary.signatoryStamp}
              accept={LOGO_ACCEPT}
              maxSizeMB={2}
              previewHeight={180}
              uploadType='image'
              translations={dictionary.upload}
            />
          </div>
        </CardContent>
      </Card>

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
        </CardContent>
      </Card>

      <div className='sticky bottom-4 z-10 flex justify-end rounded bg-backgroundPaper/90 p-4 shadow-md backdrop-blur'>
        <Button variant='contained' onClick={handleSave} disabled={isSaving}>
          <LoadingButtonContent loading={isSaving} loadingLabel={dictionary.saving}>
            {dictionary.saveAll}
          </LoadingButtonContent>
        </Button>
      </div>
    </div>
  )
}

export default SetupView
