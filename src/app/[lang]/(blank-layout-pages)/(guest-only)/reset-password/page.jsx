// Component Imports
import ResetPasswordV1 from '@views/pages/auth/ResetPasswordV1'

// Util Imports
import { getDictionary } from '@/utils/getDictionary'

export const generateMetadata = async props => {
  const params = await props.params
  const dictionary = await getDictionary(params.lang)

  return {
    title: dictionary.auth.resetPassword.metadataTitle,
    description: dictionary.auth.resetPassword.metadataDescription
  }
}

const ResetPasswordPage = async props => {
  const params = await props.params
  const searchParams = await props.searchParams
  const dictionary = await getDictionary(params.lang)
  const token = typeof searchParams?.token === 'string' ? searchParams.token : ''

  return <ResetPasswordV1 dictionary={dictionary.auth} locale={params.lang} token={token} />
}

export default ResetPasswordPage
