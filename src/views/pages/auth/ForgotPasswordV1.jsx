'use client'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
import { forgotPasswordAction } from '@/app/actions/authActions'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

// Validation Imports
import { createForgotPasswordSchema } from '@/utils/validation/authSchemas'

// Styled Component Imports
import AuthIllustrationWrapper from './AuthIllustrationWrapper'

const ForgotPasswordV1 = ({ dictionary, locale }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(createForgotPasswordSchema(dictionary.validation)),
    defaultValues: { email: '' }
  })

  const onSubmit = async data => {
    const result = await forgotPasswordAction({ ...data, locale })

    if (!result.success) {
      toast.error(result.message)

      return
    }

    toast.success(result.message)
    reset()
  }

  return (
    <AuthIllustrationWrapper>
      <Card className='flex flex-col overflow-hidden border border-divider/70 bg-paper/95 shadow-2xl backdrop-blur sm:is-[460px]'>
        <CardContent className='sm:!p-10'>
          <Link href={getLocalizedUrl('/login', locale)} className='flex justify-center mbe-6'>
            <Logo />
          </Link>
          <div className='flex flex-col gap-1 mbe-6'>
            <Typography variant='h4'>{dictionary.forgotPassword.title}</Typography>
            <Typography>{dictionary.forgotPassword.description}</Typography>
          </div>
          <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-6'>
            <Controller
              name='email'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
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
            <Button
              fullWidth
              variant='contained'
              type='submit'
              disabled={isSubmitting}
              className='min-h-11 shadow-md transition-transform hover:-translate-y-px hover:shadow-lg'
            >
              <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.forgotPassword.submitting}>
                {dictionary.forgotPassword.submit}
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
        </CardContent>
      </Card>
    </AuthIllustrationWrapper>
  )
}

export default ForgotPasswordV1
