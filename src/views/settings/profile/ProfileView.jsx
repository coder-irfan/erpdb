'use client'

import { useState } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { formatDistanceToNow } from 'date-fns'
import { enUS, faIR } from 'date-fns/locale'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { changeCurrentUserPassword, updateCurrentUserProfile } from '@/app/actions/profileActions'
import FileUpload from '@/components/common/FileUpload'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import UserAvatar from '@/components/common/UserAvatar'
import { createChangePasswordSchema, createProfileAccountSchema } from '@/utils/validation/profileSchemas'

const STATUS_COLORS = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  PENDING_ACTIVATION: 'warning',
  SUSPENDED: 'error'
}

const PROFILE_IMAGE_ACCEPT = 'image/avif,image/bmp,image/gif,image/jpeg,image/jpg,image/png,image/webp,image/svg+xml'

const DetailItem = ({ icon, label, value }) => (
  <div className='flex min-is-0 gap-3 rounded-lg border border-divider p-4'>
    <i className={`${icon} mt-0.5 text-xl text-primary`} />
    <div className='min-is-0'>
      <Typography variant='caption' color='text.secondary'>
        {label}
      </Typography>
      <Typography color='text.primary' className='break-words'>
        {value}
      </Typography>
    </div>
  </div>
)

const formatDate = (value, locale, fallback) => {
  if (!value) return fallback

  const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

  try {
    return new Intl.DateTimeFormat(localeMap[locale] || 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value))
  } catch {
    return new Date(value).toLocaleString()
  }
}

const formatRelativeDate = (value, locale, fallback) => {
  if (!value) return fallback

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return fallback

  try {
    if (locale === 'ps') {
      const elapsedSeconds = Math.round((date.getTime() - Date.now()) / 1000)

      const ranges = [
        { limit: 60, divisor: 1, unit: 'second' },
        { limit: 3600, divisor: 60, unit: 'minute' },
        { limit: 86400, divisor: 3600, unit: 'hour' },
        { limit: 2592000, divisor: 86400, unit: 'day' },
        { limit: 31536000, divisor: 2592000, unit: 'month' },
        { limit: Number.POSITIVE_INFINITY, divisor: 31536000, unit: 'year' }
      ]

      const range = ranges.find(item => Math.abs(elapsedSeconds) < item.limit) || ranges.at(-1)

      return new Intl.RelativeTimeFormat('ps-AF', { numeric: 'auto' }).format(
        Math.round(elapsedSeconds / range.divisor),
        range.unit
      )
    }

    return formatDistanceToNow(date, { addSuffix: true, locale: locale === 'fa' ? faIR : enUS })
  } catch {
    return formatDate(value, locale, fallback)
  }
}

const humanizeAuditAction = action =>
  action
    .toLocaleLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word, index) => (index === 0 ? `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}` : word))
    .join(' ')

const getActivityDescription = (activity, dictionary) => {
  const actionLabel = dictionary.activityActions[activity.action] || humanizeAuditAction(activity.action)

  return activity.entityLabel ? `${actionLabel}: ${activity.entityLabel}` : actionLabel
}

const ProfileView = ({ initialProfile, dictionary, uploadTranslations, locale }) => {
  const router = useRouter()
  const pathname = usePathname()
  const { update: updateSession } = useSession()
  const [profile, setProfile] = useState(initialProfile)
  const [activeTab, setActiveTab] = useState('account')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register: registerAccount,
    handleSubmit: handleAccountSubmit,
    setValue: setAccountValue,
    watch: watchAccount,
    reset: resetAccount,
    formState: { errors: accountErrors, isSubmitting: isAccountSubmitting }
  } = useForm({
    resolver: valibotResolver(createProfileAccountSchema(dictionary.validation)),
    defaultValues: {
      name: initialProfile.name || '',
      email: initialProfile.email || '',
      locale: initialProfile.locale || 'en',
      image: initialProfile.image || null
    }
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting }
  } = useForm({
    resolver: valibotResolver(createChangePasswordSchema(dictionary.validation)),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  })

  const image = watchAccount('image')

  const submitAccount = async values => {
    let result

    try {
      result = await updateCurrentUserProfile({ ...values, requestLocale: locale })
    } catch {
      result = { success: false, error: dictionary.messages.updateFailed }
    }

    if (!result.success) {
      toast.error(result.error)

      return
    }

    setProfile(result.data)
    resetAccount({
      name: result.data.name || '',
      email: result.data.email || '',
      locale: result.data.locale || 'en',
      image: result.data.image || null
    })
    await updateSession()
    toast.success(result.message)

    if (result.data.locale !== locale) {
      const pathSegments = pathname.split('/')

      pathSegments[1] = result.data.locale
      router.push(pathSegments.join('/'))
    } else {
      router.refresh()
    }
  }

  const submitPassword = async values => {
    let result

    try {
      result = await changeCurrentUserPassword({ ...values, locale })
    } catch {
      result = { success: false, error: dictionary.messages.passwordChangeFailed }
    }

    if (!result.success) {
      toast.error(result.error)

      return
    }

    resetPassword()
    toast.success(result.message)
  }

  const displayValue = value => value || dictionary.notAvailable
  const staff = profile.staff

  return (
    <div className='flex flex-col gap-4'>
      <Card>
        <Tabs
          value={activeTab}
          variant='scrollable'
          scrollButtons='auto'
          onChange={(_, value) => setActiveTab(value)}
          aria-label={dictionary.tabs.label}
        >
          <Tab
            value='account'
            icon={<i className='tabler-user-cog' />}
            iconPosition='start'
            label={dictionary.tabs.account}
          />
          <Tab
            value='password'
            icon={<i className='tabler-lock' />}
            iconPosition='start'
            label={dictionary.tabs.password}
          />
          <Tab
            value='employment'
            icon={<i className='tabler-briefcase' />}
            iconPosition='start'
            label={dictionary.tabs.employment}
          />
          <Tab
            value='security'
            icon={<i className='tabler-shield-check' />}
            iconPosition='start'
            label={dictionary.tabs.security}
          />
        </Tabs>
      </Card>

      {['account', 'password'].includes(activeTab) && (
        <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
          <Card className={activeTab === 'account' ? 'xl:col-span-3' : 'hidden'}>
            <CardHeader title={dictionary.account.title} subheader={dictionary.account.description} />
            <Divider />
            <CardContent>
              <form className='flex flex-col gap-6' onSubmit={handleAccountSubmit(submitAccount)} noValidate>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
                  <UserAvatar user={{ ...profile, image }} size={88} className='ring-4 ring-primary/10' />
                  <div className='w-full max-is-[360px]'>
                    <FileUpload
                      value={image}
                      onChange={value => setAccountValue('image', value, { shouldDirty: true, shouldValidate: true })}
                      label={dictionary.account.avatar}
                      accept={PROFILE_IMAGE_ACCEPT}
                      maxSizeMB={4}
                      previewHeight={180}
                      uploadType='profile'
                      translations={uploadTranslations}
                    />
                    {accountErrors.image && (
                      <Typography variant='caption' color='error'>
                        {accountErrors.image.message}
                      </Typography>
                    )}
                  </div>
                </div>
                <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
                  <CustomTextField
                    fullWidth
                    label={dictionary.account.fullName}
                    placeholder={dictionary.account.fullNamePlaceholder}
                    error={Boolean(accountErrors.name)}
                    helperText={accountErrors.name?.message}
                    disabled={isAccountSubmitting}
                    {...registerAccount('name')}
                  />
                  <CustomTextField
                    fullWidth
                    type='email'
                    label={dictionary.account.email}
                    error={Boolean(accountErrors.email)}
                    helperText={
                      accountErrors.email?.message ||
                      (!profile.canEditEmail ? dictionary.account.emailReadOnly : undefined)
                    }
                    disabled={isAccountSubmitting}
                    slotProps={{ input: { readOnly: !profile.canEditEmail } }}
                    {...registerAccount('email')}
                  />
                  <CustomTextField
                    fullWidth
                    select
                    label={dictionary.account.language}
                    disabled={isAccountSubmitting}
                    error={Boolean(accountErrors.locale)}
                    helperText={accountErrors.locale?.message}
                    defaultValue={initialProfile.locale || 'en'}
                    {...registerAccount('locale')}
                  >
                    {['en', 'fa', 'ps'].map(language => (
                      <MenuItem key={language} value={language}>
                        {dictionary.languages[language]}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </div>
                <div>
                  <Button type='submit' variant='contained' disabled={isAccountSubmitting}>
                    <LoadingButtonContent loading={isAccountSubmitting} loadingLabel={dictionary.account.saving}>
                      {dictionary.account.save}
                    </LoadingButtonContent>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className={activeTab === 'password' ? 'xl:col-span-2' : 'hidden'}>
            <CardHeader title={dictionary.password.title} subheader={dictionary.password.description} />
            <Divider />
            <CardContent>
              <form className='flex flex-col gap-5' onSubmit={handlePasswordSubmit(submitPassword)} noValidate>
                <CustomTextField
                  fullWidth
                  type='password'
                  autoComplete='current-password'
                  label={dictionary.password.current}
                  placeholder={dictionary.password.currentPlaceholder}
                  error={Boolean(passwordErrors.currentPassword)}
                  helperText={passwordErrors.currentPassword?.message}
                  disabled={isPasswordSubmitting}
                  {...registerPassword('currentPassword')}
                />
                <CustomTextField
                  fullWidth
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete='new-password'
                  label={dictionary.password.new}
                  placeholder={dictionary.password.newPlaceholder}
                  error={Boolean(passwordErrors.newPassword)}
                  helperText={passwordErrors.newPassword?.message}
                  disabled={isPasswordSubmitting}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            edge='end'
                            onClick={() => setShowNewPassword(value => !value)}
                            aria-label={showNewPassword ? dictionary.password.hide : dictionary.password.show}
                          >
                            <i className={showNewPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                  {...registerPassword('newPassword')}
                />
                <CustomTextField
                  fullWidth
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete='new-password'
                  label={dictionary.password.confirm}
                  placeholder={dictionary.password.confirmPlaceholder}
                  error={Boolean(passwordErrors.confirmPassword)}
                  helperText={passwordErrors.confirmPassword?.message}
                  disabled={isPasswordSubmitting}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            edge='end'
                            onClick={() => setShowConfirmPassword(value => !value)}
                            aria-label={showConfirmPassword ? dictionary.password.hide : dictionary.password.show}
                          >
                            <i className={showConfirmPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                  {...registerPassword('confirmPassword')}
                />
                <Button type='submit' variant='contained' disabled={isPasswordSubmitting}>
                  <LoadingButtonContent loading={isPasswordSubmitting} loadingLabel={dictionary.password.submitting}>
                    {dictionary.password.submit}
                  </LoadingButtonContent>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {['employment', 'security'].includes(activeTab) && (
        <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
          <Card className={activeTab === 'employment' ? 'xl:col-span-2' : 'hidden'}>
            <CardHeader
              title={dictionary.employment.title}
              subheader={staff ? dictionary.employment.description : dictionary.employment.adminDescription}
            />
            <Divider />
            <CardContent>
              {staff ? (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <DetailItem
                    icon='tabler-briefcase'
                    label={dictionary.employment.position}
                    value={displayValue(staff.position)}
                  />
                  <DetailItem
                    icon='tabler-phone'
                    label={dictionary.employment.phone}
                    value={displayValue(staff.phone)}
                  />
                  <DetailItem
                    icon='tabler-map-pin'
                    label={dictionary.employment.address}
                    value={displayValue(staff.address)}
                  />
                  <DetailItem
                    icon='tabler-id'
                    label={dictionary.employment.tazkiraNumber}
                    value={displayValue(staff.tazkiraNumber)}
                  />
                  <DetailItem
                    icon='tabler-calendar'
                    label={dictionary.employment.joinDate}
                    value={formatDate(staff.joinDate, locale, dictionary.notAvailable)}
                  />
                  <DetailItem
                    icon='tabler-user'
                    label={dictionary.employment.fatherName}
                    value={displayValue(staff.fatherName)}
                  />
                  <DetailItem
                    icon='tabler-school'
                    label={dictionary.employment.educations}
                    value={displayValue(staff.educations)}
                  />
                  <DetailItem
                    icon='tabler-file-time'
                    label={dictionary.employment.contractPeriod}
                    value={displayValue(staff.contractPeriod)}
                  />
                  <DetailItem
                    icon='tabler-user-check'
                    label={dictionary.employment.staffStatus}
                    value={dictionary.status[staff.status] || staff.status}
                  />
                </div>
              ) : (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <DetailItem
                    icon='tabler-shield-check'
                    label={dictionary.employment.accountStatus}
                    value={dictionary.status[profile.status] || profile.status}
                  />
                  <DetailItem
                    icon='tabler-calendar-plus'
                    label={dictionary.employment.accountCreated}
                    value={formatDate(profile.createdAt, locale, dictionary.notAvailable)}
                  />
                  <div className='rounded-lg border border-divider p-4 sm:col-span-2'>
                    <Typography variant='caption' color='text.secondary'>
                      {dictionary.employment.systemRoles}
                    </Typography>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {profile.roles.map(role => (
                        <Chip key={role.id} size='small' variant='tonal' color='primary' label={role.displayName} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={activeTab === 'security' ? 'xl:col-span-2' : 'hidden'}>
            <CardHeader title={dictionary.security.title} />
            <Divider />
            <CardContent className='flex flex-col gap-6'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.security.assignedRoles}
                  </Typography>
                  <div className='mt-2 flex flex-wrap gap-1'>
                    {profile.roles.map(role => (
                      <Chip key={role.id} size='small' variant='tonal' color='primary' label={role.displayName} />
                    ))}
                  </div>
                </div>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.security.lastLogin}
                  </Typography>
                  <Typography color='text.primary'>
                    {formatDate(profile.lastLoginAt, locale, dictionary.security.never)}
                  </Typography>
                </div>
                <div>
                  <Typography variant='caption' color='text.secondary'>
                    {dictionary.security.createdBy}
                  </Typography>
                  <Typography color='text.primary'>{profile.createdBy?.name || dictionary.security.system}</Typography>
                </div>
              </div>
              <Divider />
              <div>
                <Typography variant='h6' className='mb-3'>
                  {dictionary.security.recentActivity}
                </Typography>
                {profile.recentActivity.length === 0 ? (
                  <Alert severity='info'>{dictionary.security.noActivity}</Alert>
                ) : (
                  <div className='flex flex-col gap-3'>
                    {profile.recentActivity.map(activity => (
                      <div key={activity.id} className='flex items-center gap-3 rounded-lg bg-actionHover p-3'>
                        <i className='tabler-activity text-xl text-primary' />
                        <div className='min-is-0 grow'>
                          <Typography color='text.primary'>{getActivityDescription(activity, dictionary)}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {formatRelativeDate(activity.createdAt, locale, dictionary.notAvailable)}
                          </Typography>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default ProfileView
