'use client'

import { useMemo, useState } from 'react'

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
import { useSettings } from '@core/hooks/useSettings'
import FileUpload from '@/components/common/FileUpload'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import ColorPickerField from '@/components/inputs/ColorPickerField'
import ConfirmationDeleteModal from '@/components/dialogs/ConfirmationDeleteModal'
import NativeDateTimeInput from '@/components/inputs/NativeDateTimeInput'
import themeConfig from '@/configs/themeConfig'

const LOGO_ACCEPT =
  'image/avif,image/bmp,image/gif,image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon'

const FAVICON_ACCEPT = {
  'image/ico': ['.ico'],
  'image/png': ['.png'],
  'image/svg+xml': ['.svg'],
  'image/vnd.microsoft.icon': ['.ico'],
  'image/x-icon': ['.ico']
}

const getInitialForm = (settings, themeSettings = {}) => ({
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
  weekend_days: '5',
  default_work_end: settings.default_work_end || '17:30',
  primary_color_light: themeSettings.primaryColorLight || themeSettings.primaryColor || themeConfig.primaryColorLight,
  secondary_color_light:
    themeSettings.secondaryColorLight || themeSettings.secondaryColor || themeConfig.secondaryColorLight,
  primary_color_dark: themeSettings.primaryColorDark || themeConfig.primaryColorDark,
  secondary_color_dark: themeSettings.secondaryColorDark || themeConfig.secondaryColorDark
})

const getSavedState = (settings, themeSettings = {}) => ({
  form: getInitialForm(settings, themeSettings),
  companyLogo: settings.company_logo || null,
  signatoryStamp: settings.signatory_stamp || null,
  lightLogoUrl: settings.lightLogoUrl || null,
  darkLogoUrl: settings.darkLogoUrl || null,
  faviconUrl: settings.faviconUrl || null
})

const HEX_COLOR_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6})$/i

const normalizeHex = value => {
  const normalized = String(value || '').trim()

  if (!HEX_COLOR_PATTERN.test(normalized)) return null

  const hex = normalized.slice(1)
  const expanded = hex.length === 3 ? [...hex].map(character => character.repeat(2)).join('') : hex

  return `#${expanded.toUpperCase()}`
}

const isValidColor = value => Boolean(normalizeHex(value))

const ThemeColorControl = ({ name, label, description, value, fallback, onChange, dictionary }) => {
  const valid = isValidColor(value)
  const pickerValue = normalizeHex(value) || fallback

  return (
    <div className='rounded border border-divider p-4'>
      <div className='mb-4 flex items-center gap-3'>
        <span
          className='size-12 shrink-0 rounded-lg border border-divider shadow-sm'
          style={{ backgroundColor: valid ? value : 'transparent' }}
          aria-label={`${label} ${dictionary.livePreview}`}
        />
        <div>
          <Typography className='font-semibold'>{label}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {description}
          </Typography>
        </div>
      </div>
      <div className='flex items-start gap-3'>
        <ColorPickerField
          compact
          name={name}
          label={dictionary.pickColor.replace('{color}', label)}
          value={pickerValue}
          onChange={onChange}
        />
        <CustomTextField
          fullWidth
          name={name}
          label={dictionary.colorCode}
          value={value}
          onChange={onChange}
          onBlur={() => {
            const normalized = normalizeHex(value)

            if (normalized) onChange({ target: { name, value: normalized } })
          }}
          error={!valid}
          helperText={!valid ? dictionary.invalidHexColor : dictionary.hexColorFormats}
        />
      </div>
    </div>
  )
}

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
  const { settings, updateSettings } = useSettings()
  const [activeTab, setActiveTab] = useState('general')
  const [savedState, setSavedState] = useState(() => getSavedState(initialSettings, settings))
  const [form, setForm] = useState(() => savedState.form)
  const [companyLogo, setCompanyLogo] = useState(() => savedState.companyLogo)
  const [signatoryStamp, setSignatoryStamp] = useState(() => savedState.signatoryStamp)
  const [lightLogoUrl, setLightLogoUrl] = useState(() => savedState.lightLogoUrl)
  const [darkLogoUrl, setDarkLogoUrl] = useState(() => savedState.darkLogoUrl)
  const [faviconUrl, setFaviconUrl] = useState(() => savedState.faviconUrl)
  const [isSaving, setIsSaving] = useState(false)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)

  const isDirty = useMemo(
    () =>
      JSON.stringify({ form, companyLogo, signatoryStamp, lightLogoUrl, darkLogoUrl, faviconUrl }) !==
      JSON.stringify(savedState),
    [companyLogo, darkLogoUrl, faviconUrl, form, lightLogoUrl, savedState, signatoryStamp]
  )

  const updateField = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))

  const resetToSavedState = () => {
    setForm(savedState.form)
    setCompanyLogo(savedState.companyLogo)
    setSignatoryStamp(savedState.signatoryStamp)
    setLightLogoUrl(savedState.lightLogoUrl)
    setDarkLogoUrl(savedState.darkLogoUrl)
    setFaviconUrl(savedState.faviconUrl)
  }

  const handleCancel = () => {
    if (isDirty) {
      setDiscardDialogOpen(true)

      return
    }

    resetToSavedState()
  }

  const handleDiscard = () => {
    resetToSavedState()
    setDiscardDialogOpen(false)
  }

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

    const normalizedThemeColors = {
      primaryColorLight: normalizeHex(form.primary_color_light),
      secondaryColorLight: normalizeHex(form.secondary_color_light),
      primaryColorDark: normalizeHex(form.primary_color_dark),
      secondaryColorDark: normalizeHex(form.secondary_color_dark)
    }

    if (Object.values(normalizedThemeColors).some(color => !color)) {
      toast.error(dictionary.validation.themeColorInvalid)

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

      updateSettings(normalizedThemeColors)
      const nextSavedState = getSavedState(result.data, normalizedThemeColors)

      setSavedState(nextSavedState)
      setForm(nextSavedState.form)
      setCompanyLogo(nextSavedState.companyLogo)
      setSignatoryStamp(nextSavedState.signatoryStamp)
      setLightLogoUrl(nextSavedState.lightLogoUrl)
      setDarkLogoUrl(nextSavedState.darkLogoUrl)
      setFaviconUrl(nextSavedState.faviconUrl)
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
          <Tab
            value='theme'
            icon={<i className='tabler-palette' />}
            iconPosition='start'
            label={dictionary.tabs.theme}
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
            <NativeDateTimeInput
              fullWidth
              mode='time'
              locale={locale}
              name='default_work_start'
              label={dictionary.fields.workStart}
              value={form.default_work_start}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={updateField}
            />
            <NativeDateTimeInput
              fullWidth
              mode='time'
              locale={locale}
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

      {activeTab === 'theme' && (
        <SettingsCard title={dictionary.sections.themeTitle} description={dictionary.sections.themeDescription}>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Card variant='outlined'>
              <CardContent className='flex flex-col gap-4'>
                <div className='flex items-center gap-3'>
                  <span className='flex size-10 items-center justify-center rounded bg-primaryLighter text-primary'>
                    <i className='tabler-sun text-xl' />
                  </span>
                  <div>
                    <Typography variant='h6'>{dictionary.theme.lightThemeTitle}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {dictionary.theme.lightThemeDescription}
                    </Typography>
                  </div>
                </div>
                <ThemeColorControl
                  name='primary_color_light'
                  label={dictionary.fields.primaryColorLight}
                  description={dictionary.theme.primaryDescription}
                  value={form.primary_color_light}
                  fallback={themeConfig.primaryColorLight}
                  onChange={updateField}
                  dictionary={dictionary.theme}
                />
                <ThemeColorControl
                  name='secondary_color_light'
                  label={dictionary.fields.secondaryColorLight}
                  description={dictionary.theme.secondaryDescription}
                  value={form.secondary_color_light}
                  fallback={themeConfig.secondaryColorLight}
                  onChange={updateField}
                  dictionary={dictionary.theme}
                />
                <div
                  className='rounded-lg border border-divider p-4'
                  style={{
                    background: `linear-gradient(135deg, ${normalizeHex(form.primary_color_light) || themeConfig.primaryColorLight}, ${normalizeHex(form.secondary_color_light) || themeConfig.secondaryColorLight})`
                  }}
                >
                  <Typography className='font-semibold text-white'>{dictionary.theme.livePreview}</Typography>
                </div>
              </CardContent>
            </Card>
            <Card variant='outlined'>
              <CardContent className='flex flex-col gap-4'>
                <div className='flex items-center gap-3'>
                  <span className='flex size-10 items-center justify-center rounded bg-actionSelected text-textPrimary'>
                    <i className='tabler-moon-stars text-xl' />
                  </span>
                  <div>
                    <Typography variant='h6'>{dictionary.theme.darkThemeTitle}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {dictionary.theme.darkThemeDescription}
                    </Typography>
                  </div>
                </div>
                <ThemeColorControl
                  name='primary_color_dark'
                  label={dictionary.fields.primaryColorDark}
                  description={dictionary.theme.primaryDescription}
                  value={form.primary_color_dark}
                  fallback={themeConfig.primaryColorDark}
                  onChange={updateField}
                  dictionary={dictionary.theme}
                />
                <ThemeColorControl
                  name='secondary_color_dark'
                  label={dictionary.fields.secondaryColorDark}
                  description={dictionary.theme.secondaryDescription}
                  value={form.secondary_color_dark}
                  fallback={themeConfig.secondaryColorDark}
                  onChange={updateField}
                  dictionary={dictionary.theme}
                />
                <div
                  className='rounded-lg border border-white/15 p-4'
                  style={{
                    background: `linear-gradient(135deg, ${normalizeHex(form.primary_color_dark) || themeConfig.primaryColorDark}, ${normalizeHex(form.secondary_color_dark) || themeConfig.secondaryColorDark})`
                  }}
                >
                  <Typography className='font-semibold text-white'>{dictionary.theme.livePreview}</Typography>
                </div>
              </CardContent>
            </Card>
          </div>
        </SettingsCard>
      )}

      <div className='sticky bottom-4 z-10 flex justify-end rounded bg-backgroundPaper/90 p-4 shadow-md backdrop-blur'>
        <div className='flex gap-3'>
          <Button variant='tonal' color='secondary' onClick={handleCancel} disabled={isSaving}>
            {dictionary.cancel}
          </Button>
          <Button variant='contained' onClick={handleSave} disabled={isSaving}>
            <LoadingButtonContent loading={isSaving} loadingLabel={dictionary.saving}>
              {dictionary.saveAll}
            </LoadingButtonContent>
          </Button>
        </div>
      </div>

      <ConfirmationDeleteModal
        open={discardDialogOpen}
        title={dictionary.discardChangesTitle}
        message={dictionary.discardChangesMessage}
        confirmText={dictionary.discard}
        cancelText={dictionary.keepEditing}
        color='warning'
        onConfirm={handleDiscard}
        onClose={() => setDiscardDialogOpen(false)}
      />
    </div>
  )
}

export default SetupView
