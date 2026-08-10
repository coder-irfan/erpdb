'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { acceptInvitationAction } from '@/app/actions/invitationActions'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import Logo from '@/components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'
import { getLocalizedUrl } from '@/utils/i18n'
import { createAcceptInvitationSchema } from '@/utils/validation/authSchemas'

import AuthIllustrationWrapper from './AuthIllustrationWrapper'

const getPasswordStrength = (password, dictionary) => {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ]

  const score = checks.filter(Boolean).length

  if (score >= 5) return { color: 'success', label: dictionary.strengthStrong, value: 100 }
  if (score >= 3) return { color: 'warning', label: dictionary.strengthFair, value: 60 }

  return { color: 'error', label: dictionary.strengthWeak, value: password ? 25 : 0 }
}

const AcceptInviteV1 = ({ dictionary, locale, token, invitation, invitationError, contactHref }) => {
  const router = useRouter()
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [isConfirmationShown, setIsConfirmationShown] = useState(false)

  const {
    control,
    handleSubmit,
    register,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createAcceptInvitationSchema(dictionary.validation)),
    defaultValues: {
      token,
      name: invitation?.name || '',
      password: '',
      confirmPassword: ''
    }
  })

  const password = watch('password') || ''
  const passwordStrength = useMemo(() => getPasswordStrength(password, dictionary), [dictionary, password])

  const onSubmit = async values => {
    let result

    try {
      result = await acceptInvitationAction({ ...values, locale })
    } catch {
      result = { success: false, error: dictionary.messages.failed }
    }

    if (!result.success) {
      toast.error(result.error)

      return
    }

    toast.success(result.message)
    await new Promise(resolve => setTimeout(resolve, 1200))
    router.replace(getLocalizedUrl('/login', locale))
  }

  return (
    <AuthIllustrationWrapper>
      <Card className='flex flex-col sm:is-[470px]'>
        <CardContent className='sm:!p-12'>
          <Link href={getLocalizedUrl('/login', locale)} className='flex justify-center mbe-6'>
            <Logo />
          </Link>
          {!invitation ? (
            <div className='flex flex-col gap-5'>
              <div className='flex flex-col gap-2 text-center'>
                <Typography variant='h4'>{dictionary.invalidTitle}</Typography>
                <Typography color='text.secondary'>{dictionary.invalidDescription}</Typography>
              </div>
              {invitationError && <Alert severity='error'>{invitationError}</Alert>}
              <Button component={Link} href={contactHref} fullWidth variant='contained'>
                {dictionary.contactAdmin}
              </Button>
              <Button component={Link} href={getLocalizedUrl('/login', locale)} fullWidth variant='tonal'>
                {dictionary.backToLogin}
              </Button>
            </div>
          ) : (
            <>
              <div className='flex flex-col gap-1 mbe-6'>
                <Typography variant='h4'>{dictionary.title}</Typography>
                <Typography color='text.secondary'>{dictionary.description}</Typography>
              </div>
              <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
                <input type='hidden' {...register('token')} />
                <CustomTextField
                  autoFocus
                  fullWidth
                  label={dictionary.fullName}
                  placeholder={dictionary.fullNamePlaceholder}
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                  disabled={isSubmitting}
                  {...register('name')}
                />
                <CustomTextField
                  fullWidth
                  label={dictionary.email}
                  value={invitation.email}
                  slotProps={{ input: { readOnly: true } }}
                />
                <Controller
                  name='password'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label={dictionary.password}
                      placeholder={dictionary.passwordPlaceholder}
                      type={isPasswordShown ? 'text' : 'password'}
                      error={Boolean(errors.password)}
                      helperText={errors.password?.message}
                      disabled={isSubmitting}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton
                                edge='end'
                                onClick={() => setIsPasswordShown(shown => !shown)}
                                onMouseDown={event => event.preventDefault()}
                              >
                                <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                              </IconButton>
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  )}
                />
                <div className='flex flex-col gap-2'>
                  <div className='flex items-center justify-between gap-3'>
                    <Typography variant='caption' color='text.secondary'>
                      {dictionary.passwordStrength}
                    </Typography>
                    <Typography variant='caption' color={`${passwordStrength.color}.main`}>
                      {passwordStrength.label}
                    </Typography>
                  </div>
                  <LinearProgress
                    variant='determinate'
                    value={passwordStrength.value}
                    color={passwordStrength.color}
                    className='rounded'
                  />
                </div>
                <Controller
                  name='confirmPassword'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label={dictionary.confirmPassword}
                      placeholder={dictionary.confirmPasswordPlaceholder}
                      type={isConfirmationShown ? 'text' : 'password'}
                      error={Boolean(errors.confirmPassword)}
                      helperText={errors.confirmPassword?.message}
                      disabled={isSubmitting}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton
                                edge='end'
                                onClick={() => setIsConfirmationShown(shown => !shown)}
                                onMouseDown={event => event.preventDefault()}
                              >
                                <i className={isConfirmationShown ? 'tabler-eye-off' : 'tabler-eye'} />
                              </IconButton>
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  )}
                />
                <Button fullWidth variant='contained' type='submit' disabled={isSubmitting}>
                  <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.submitting}>
                    {dictionary.submit}
                  </LoadingButtonContent>
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </AuthIllustrationWrapper>
  )
}

export default AcceptInviteV1
