import { getServerSession } from 'next-auth'

import { getProjectsDictionary } from '@/data/dictionaries/projects'
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
      canWrite={hasAnyPermission(session, ['projects:write'])}
      canDelete={hasAnyPermission(session, ['projects:delete'])}
    />
  )
}

export default ProjectsPage
