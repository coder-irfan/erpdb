import { redirect } from 'next/navigation'

const ContractInvoicesPage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/contracts/invoices`)
}

export default ContractInvoicesPage
