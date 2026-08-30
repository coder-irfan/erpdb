import { getServerSession } from 'next-auth'

import { getProjectsDictionary } from '@/data/dictionaries/projects'
import { getTasksDictionary } from '@/data/dictionaries/tasks'
import { authOptions } from '@/libs/auth'
import { hasAnyPermission } from '@/utils/rbac'
import ProjectsView from '@/views/projects/ProjectsView'

const ProjectsPage = async props => {
  const { lang } = await props.params
  const session = await getServerSession(authOptions)

  return (
    <ProjectsView
      locale={lang}
      dictionary={getProjectsDictionary(lang)}
      taskDictionary={getTasksDictionary(lang)}
      canWrite={hasAnyPermission(session, ['projects:write'])}
      canDelete={hasAnyPermission(session, ['projects:delete'])}
      canTaskManage={hasAnyPermission(session, ['tasks:write'])}
      canTaskUpdate={hasAnyPermission(session, ['tasks:write', 'tasks:read_assigned'])}
      canTaskDelete={hasAnyPermission(session, ['tasks:delete'])}
    />
  )
}

export default ProjectsPage
