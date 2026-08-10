import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'

import { getDictionary } from '@/utils/getDictionary'

const AuditLogsPage = async props => {
  const { lang } = await props.params
  const dictionary = await getDictionary(lang)

  return (
    <Card>
      <CardHeader title={dictionary.navigation.systemAuditLogs} />
    </Card>
  )
}

export default AuditLogsPage
