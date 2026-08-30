import { redirect } from 'next/navigation'

const LegacyHrmLoansPage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/finance/loans`)
}

export default LegacyHrmLoansPage
