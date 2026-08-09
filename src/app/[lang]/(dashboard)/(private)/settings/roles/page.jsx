import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'

import { getDictionary } from '@/utils/getDictionary'

const RolesPermissionsPage = async props => {
  const params = await props.params
  const dictionary = await getDictionary(params.lang)

  return (
    <Card>
      <CardHeader title={dictionary.navigation.rolesPermissions} />
    </Card>
  )
}

export default RolesPermissionsPage
