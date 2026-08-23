import { redirect } from 'next/navigation'

const LegacyContractPoliciesPage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/options/contract-management/contract-templates`)
}

export default LegacyContractPoliciesPage
