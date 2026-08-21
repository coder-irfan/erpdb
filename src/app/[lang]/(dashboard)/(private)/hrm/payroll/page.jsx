import { redirect } from 'next/navigation'

const PayrollPage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/finance/salary`)
}

export default PayrollPage
