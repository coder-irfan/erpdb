'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// MUI Imports
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

// Component Imports
import DirectionalIcon from '@components/DirectionalIcon'
import LoadingButtonContent from '@components/LoadingButtonContent'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

// Server Action Imports
import { resetPasswordAction } from '@/app/actions/authActions'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

// Validation Imports
import { createResetPasswordSchema } from '@/utils/validation/authSchemas'

// Styled Component Imports
import AuthIllustrationWrapper from './AuthIllustrationWrapper'

const ResetPasswordV1 = ({ dictionary, locale, token }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [isConfirmPasswordShown, setIsConfirmPasswordShown] = useState(false)

  const router = useRouter()

  const {
    control,
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createResetPasswordSchema(dictionary.validation)),
    defaultValues: {
      token,
      password: '',
      confirmPassword: ''
    }
  })

  const onSubmit = async data => {
    const result = await resetPasswordAction({ ...data, locale })

    if (!result.success) {
      toast.error(result.message)

      return
    }

    toast.success(result.message)
    await new Promise(resolve => setTimeout(resolve, 1200))
    router.replace(getLocalizedUrl('/login', locale))
  }

  return (
    <AuthIllustrationWrapper>
      <Card className='flex flex-col sm:is-[450px]'>
        <CardContent className='sm:!p-12'>
          <Link href={getLocalizedUrl('/login', locale)} className='flex justify-center mbe-6'>
            <Logo />
          </Link>
          {!token ? (
            <div className='flex flex-col gap-5'>
              <div className='flex flex-col gap-1'>
                <Typography variant='h4'>{dictionary.resetPassword.invalidTitle}</Typography>
                <Typography>{dictionary.resetPassword.invalidDescription}</Typography>
              </div>
              <Button component={Link} href={getLocalizedUrl('/login', locale)} fullWidth variant='contained'>
                {dictionary.common.backToLogin}
              </Button>
            </div>
          ) : (
            <>
              <div className='flex flex-col gap-1 mbe-6'>
                <Typography variant='h4'>{dictionary.resetPassword.title}</Typography>
                <Typography>{dictionary.resetPassword.description}</Typography>
              </div>
              <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-6'>
                <input type='hidden' {...register('token')} />
                <Controller
                  name='password'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      autoFocus
                      fullWidth
                      label={dictionary.resetPassword.newPassword}
                      placeholder={dictionary.resetPassword.newPasswordPlaceholder}
                      type={isPasswordShown ? 'text' : 'password'}
                      error={Boolean(errors.password)}
                      helperText={errors.password?.message}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton
                                edge='end'
                                onClick={() => setIsPasswordShown(shown => !shown)}
                                onMouseDown={event => event.preventDefault()}
                                aria-label={
                                  isPasswordShown ? dictionary.common.hidePassword : dictionary.common.showPassword
                                }
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
                <Controller
                  name='confirmPassword'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label={dictionary.resetPassword.confirmPassword}
                      placeholder={dictionary.resetPassword.confirmPasswordPlaceholder}
                      type={isConfirmPasswordShown ? 'text' : 'password'}
                      error={Boolean(errors.confirmPassword)}
                      helperText={errors.confirmPassword?.message}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton
                                edge='end'
                                onClick={() => setIsConfirmPasswordShown(shown => !shown)}
                                onMouseDown={event => event.preventDefault()}
                                aria-label={
                                  isConfirmPasswordShown
                                    ? dictionary.resetPassword.hideConfirmation
                                    : dictionary.resetPassword.showConfirmation
                                }
                              >
                                <i className={isConfirmPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                              </IconButton>
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  )}
                />
                <Button fullWidth variant='contained' type='submit' disabled={isSubmitting}>
                  <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.resetPassword.submitting}>
                    {dictionary.resetPassword.submit}
                  </LoadingButtonContent>
                </Button>
                <Typography className='flex justify-center items-center' color='primary.main'>
                  <Link href={getLocalizedUrl('/login', locale)} className='flex items-center gap-1.5'>
                    <DirectionalIcon
                      ltrIconClass='tabler-chevron-left'
                      rtlIconClass='tabler-chevron-right'
                      className='text-xl'
                    />
                    <span>{dictionary.common.backToLogin}</span>
                  </Link>
                </Typography>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </AuthIllustrationWrapper>
  )
}

export default ResetPasswordV1
