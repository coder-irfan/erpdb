import { redirect } from 'next/navigation'

const StaffListPage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/hrm/staff`)
}

export default StaffListPage
