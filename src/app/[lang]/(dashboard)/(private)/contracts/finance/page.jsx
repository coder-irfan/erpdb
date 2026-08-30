import { redirect } from 'next/navigation'

const FinanceContractsPage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/contracts`)
}

export default FinanceContractsPage
