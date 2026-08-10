// Component Imports
import LoginV1 from '@views/pages/auth/LoginV1'

// Util Imports
import { getDictionary } from '@/utils/getDictionary'

export const generateMetadata = async props => {
  const params = await props.params
  const dictionary = await getDictionary(params.lang)

  return {
    title: dictionary.auth.login.metadataTitle,
    description: dictionary.auth.login.metadataDescription
  }
}

const LoginPage = async props => {
  const params = await props.params
  const dictionary = await getDictionary(params.lang)

  return <LoginV1 dictionary={dictionary.auth} locale={params.lang} />
}

export default LoginPage
