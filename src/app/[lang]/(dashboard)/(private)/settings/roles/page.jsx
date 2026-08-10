import { redirect } from 'next/navigation'

const LegacyRolesPage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/setup/roles`)
}

export default LegacyRolesPage
