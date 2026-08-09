import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'

import { getDictionary } from '@/utils/getDictionary'

const TasksPage = async props => {
  const params = await props.params
  const dictionary = await getDictionary(params.lang)

  return (
    <Card>
      <CardHeader title={dictionary.navigation.tasks} />
    </Card>
  )
}

export default TasksPage
