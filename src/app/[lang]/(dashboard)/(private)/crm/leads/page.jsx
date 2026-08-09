import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'

import { getDictionary } from '@/utils/getDictionary'

const CrmLeadsPage = async props => {
  const params = await props.params
  const dictionary = await getDictionary(params.lang)

  return (
    <Card>
      <CardHeader title={dictionary.navigation.crmLeads} />
    </Card>
  )
}

export default CrmLeadsPage
