import { redirect } from 'next/navigation'

const LegacyProfilePage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/settings/profile`)
}

export default LegacyProfilePage
