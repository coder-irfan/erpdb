import { getServerSession } from 'next-auth'

import { getTasksDictionary } from '@/data/dictionaries/tasks'
import { authOptions } from '@/libs/auth'
import { hasAnyPermission, hasPermission } from '@/utils/rbac'
import TasksView from '@/views/tasks/TasksView'

const TasksPage = async props => {
  const { lang } = await props.params
  const session = await getServerSession(authOptions)

  return <TasksView locale={lang} dictionary={getTasksDictionary(lang)} canManage={hasPermission(session, 'tasks:write')} canUpdate={hasAnyPermission(session, ['tasks:write', 'tasks:read_assigned'])} canDelete={hasPermission(session, 'tasks:delete')} />
}

export default TasksPage
