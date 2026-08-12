import { getDictionary } from '@/utils/getDictionary'
import StaffLeavesView from '@/views/hrm/leaves/StaffLeavesView'

const LeavesPage = async props => {
  const { lang } = await props.params
  const dictionary = await getDictionary(lang)

  return <StaffLeavesView locale={lang} dictionary={dictionary.hrmLeaves} />
}

export default LeavesPage
