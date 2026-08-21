import { redirect } from 'next/navigation'

const LegacyInventoryOptionsPage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/finance/inventory`)
}

export default LegacyInventoryOptionsPage
