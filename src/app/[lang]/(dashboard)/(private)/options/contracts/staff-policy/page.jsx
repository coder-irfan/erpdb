import { redirect } from 'next/navigation'

const LegacyContractPoliciesPage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/options/hrm/policies`)
}

export default LegacyContractPoliciesPage
