'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

// MUI Imports
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

// Component Imports
import LoadingButtonContent from '@components/LoadingButtonContent'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

// Server Action Imports
import { loginAction } from '@/app/actions/authActions'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

// Validation Imports
import { createLoginSchema } from '@/utils/validation/authSchemas'

// Styled Component Imports
import AuthIllustrationWrapper from './AuthIllustrationWrapper'

const LoginV1 = ({ dictionary, locale }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createLoginSchema(dictionary.validation)),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  })

  const onSubmit = async data => {
    const result = await loginAction({ ...data, locale })

    if (!result.success) {
      toast.error(result.message)

      return
    }

    toast.success(result.message)

    const callbackUrl = searchParams.get('callbackUrl')

    const redirectUrl =
      callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//')
        ? callbackUrl
        : getLocalizedUrl('/dashboard', locale)

    router.replace(redirectUrl)
    router.refresh()
  }

  return (
    <AuthIllustrationWrapper>
      <Card className='flex flex-col overflow-hidden border border-divider/70 bg-paper/95 shadow-2xl backdrop-blur sm:is-[460px]'>
        <CardContent className='sm:!p-10'>
          <Link href={getLocalizedUrl('/', locale)} className='flex justify-center mbe-6'>
            <Logo />
          </Link>
          <Typography variant='h4' className='mbe-6'>
            {dictionary.login.title}
          </Typography>
          <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-6'>
            <Controller
              name='email'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  className='[&_.MuiInputBase-input]:pe-12'
                  autoFocus
                  fullWidth
                  type='email'
                  label={dictionary.common.email}
                  placeholder={dictionary.common.emailPlaceholder}
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                />
              )}
            />
            <Controller
              name='password'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  fullWidth
                  label={dictionary.common.password}
                  placeholder={dictionary.common.passwordPlaceholder}
                  id='login-password'
                  type={isPasswordShown ? 'text' : 'password'}
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            edge='end'
                            className='-mie-1 rounded-md hover:bg-actionHover'
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
            <div className='flex justify-between items-center gap-x-3 gap-y-1 flex-wrap'>
              <Controller
                name='rememberMe'
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={event => field.onChange(event.target.checked)}
                        inputRef={field.ref}
                      />
                    }
                    label={dictionary.login.rememberMe}
                  />
                )}
              />
              <Typography className='text-end' color='primary.main'>
                <Link href={getLocalizedUrl('/forgot-password', locale)}>{dictionary.login.forgotPassword}</Link>
              </Typography>
            </div>
            <Button
              fullWidth
              variant='contained'
              type='submit'
              disabled={isSubmitting}
              className='min-h-11 shadow-md transition-transform hover:-translate-y-px hover:shadow-lg'
            >
              <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.login.submitting}>
                {dictionary.login.submit}
              </LoadingButtonContent>
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthIllustrationWrapper>
  )
}

export default LoginV1
