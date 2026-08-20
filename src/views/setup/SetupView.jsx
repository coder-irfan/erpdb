'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
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
  currency_code: settings.currency_code || 'AFN',
  usd_afn_exchange_rate: settings.usd_afn_exchange_rate || '65.0000',
  default_work_start: settings.default_work_start || '08:30',
  default_work_end: settings.default_work_end || '17:30'
})

const SettingsCard = ({ title, description, children }) => (
  <Card>
    <CardContent className='flex flex-col gap-5'>
      <div>
        <Typography variant='h6'>{title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {description}
        </Typography>
      </div>
      {children}
    </CardContent>
  </Card>
)

const SetupView = ({ dictionary, initialSettings, locale }) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')
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

    if (Number(form.usd_afn_exchange_rate) <= 0) {
      toast.error(dictionary.validation.exchangeRatePositive)

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
    <div className='flex flex-col gap-4'>
      <Card>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant='scrollable'
          scrollButtons='auto'
          className='border-be border-divider px-2'
        >
          <Tab
            value='general'
            icon={<i className='tabler-building' />}
            iconPosition='start'
            label={dictionary.tabs.general}
          />
          <Tab
            value='localization'
            icon={<i className='tabler-world-cog' />}
            iconPosition='start'
            label={dictionary.tabs.localization}
          />
          <Tab
            value='branding'
            icon={<i className='tabler-photo-cog' />}
            iconPosition='start'
            label={dictionary.tabs.branding}
          />
          <Tab
            value='signatories'
            icon={<i className='tabler-signature' />}
            iconPosition='start'
            label={dictionary.tabs.signatories}
          />
        </Tabs>
      </Card>

      {activeTab === 'general' && (
        <SettingsCard title={dictionary.sections.generalTitle} description={dictionary.sections.generalDescription}>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <CustomTextField
              fullWidth
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
              name='company_address'
              label={dictionary.fields.companyAddress}
              value={form.company_address}
              onChange={updateField}
            />
          </div>
        </SettingsCard>
      )}

      {activeTab === 'localization' && (
        <SettingsCard
          title={dictionary.sections.localizationTitle}
          description={dictionary.sections.localizationDescription}
        >
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <CustomTextField
              select
              fullWidth
              name='currency_code'
              label={dictionary.fields.baseCurrency}
              value={form.currency_code}
              onChange={updateField}
              sx={{ '& .MuiInputBase-root': { backgroundColor: 'transparent' } }}
            >
              <MenuItem value='AFN'>AFN</MenuItem>
              <MenuItem value='USD'>USD</MenuItem>
            </CustomTextField>
            <CustomTextField
              fullWidth
              type='number'
              name='usd_afn_exchange_rate'
              label={dictionary.fields.exchangeRate}
              value={form.usd_afn_exchange_rate}
              slotProps={{ htmlInput: { min: 0.0001, step: 0.0001 } }}
              onChange={updateField}
              sx={{ '& .MuiInputBase-root': { backgroundColor: 'transparent' } }}
            />
            <CustomTextField
              fullWidth
              type='time'
              name='default_work_start'
              label={dictionary.fields.workStart}
              value={form.default_work_start}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={updateField}
            />
            <CustomTextField
              fullWidth
              type='time'
              name='default_work_end'
              label={dictionary.fields.workEnd}
              value={form.default_work_end}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={updateField}
            />
          </div>
        </SettingsCard>
      )}

      {activeTab === 'branding' && (
        <SettingsCard title={dictionary.sections.brandingTitle} description={dictionary.sections.brandingDescription}>
          <div className='flex flex-col gap-6 md:gap-10 lg:gap-12'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <FileUpload
                compact
                value={companyLogo}
                onChange={setCompanyLogo}
                label={dictionary.companyLogo}
                accept={LOGO_ACCEPT}
                maxSizeMB={2}
                uploadType='logo'
                translations={dictionary.upload}
              />
              <FileUpload
                compact
                value={signatoryStamp}
                onChange={setSignatoryStamp}
                label={dictionary.signatoryStamp}
                accept={LOGO_ACCEPT}
                maxSizeMB={2}
                uploadType='image'
                translations={dictionary.upload}
              />
            </div>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <FileUpload
                compact
                value={lightLogoUrl}
                onChange={setLightLogoUrl}
                label={dictionary.lightLogo}
                accept={LOGO_ACCEPT}
                maxSizeMB={2}
                uploadType='logo'
                translations={dictionary.upload}
              />
              <FileUpload
                compact
                value={darkLogoUrl}
                onChange={setDarkLogoUrl}
                label={dictionary.darkLogo}
                accept={LOGO_ACCEPT}
                maxSizeMB={2}
                uploadType='logo'
                translations={dictionary.upload}
              />
              <FileUpload
                compact
                value={faviconUrl}
                onChange={setFaviconUrl}
                label={dictionary.favicon}
                accept={FAVICON_ACCEPT}
                maxSizeMB={1}
                uploadType='favicon'
                translations={{
                  ...dictionary.upload,
                  fileHint: dictionary.faviconFileHint,
                  previewAlt: dictionary.faviconPreviewAlt,
                  unsupportedType: dictionary.faviconUnsupportedType
                }}
              />
            </div>
          </div>
        </SettingsCard>
      )}

      {activeTab === 'signatories' && (
        <SettingsCard
          title={dictionary.sections.signatoriesTitle}
          description={dictionary.sections.signatoriesDescription}
        >
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
          </div>
        </SettingsCard>
      )}

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
