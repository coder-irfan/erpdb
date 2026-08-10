// Component Imports
import ForgotPasswordV1 from '@views/pages/auth/ForgotPasswordV1'

// Util Imports
import { getDictionary } from '@/utils/getDictionary'

export const generateMetadata = async props => {
  const params = await props.params
  const dictionary = await getDictionary(params.lang)

  return {
    title: dictionary.auth.forgotPassword.metadataTitle,
    description: dictionary.auth.forgotPassword.metadataDescription
  }
}

const ForgotPasswordPage = async props => {
  const params = await props.params
  const dictionary = await getDictionary(params.lang)

  return <ForgotPasswordV1 dictionary={dictionary.auth} locale={params.lang} />
}

export default ForgotPasswordPage
