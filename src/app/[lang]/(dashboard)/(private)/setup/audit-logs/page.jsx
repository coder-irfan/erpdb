import { redirect } from 'next/navigation'

import { getServerSession } from 'next-auth'

import { getAuditLogsPage } from '@/actions/notifications'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import AuditLogsView from '@/views/setup/audit-logs/AuditLogsView'

const AuditLogsPage = async props => {
  const { lang } = await props.params
  const session = await getServerSession(authOptions)

  if (!session?.user?.roles?.includes('super_admin')) redirect(`/${lang}/403`)

  const [dictionary, result] = await Promise.all([getDictionary(lang), getAuditLogsPage({ page: 1, limit: 10 })])

  return (
    <AuditLogsView
      initialResult={result.success ? result.data : { logs: [], totalCount: 0, page: 1, totalPages: 1, canDelete: true }}
      initialError={result.success ? null : result.error}
      locale={lang}
      dictionary={dictionary.notifications}
    />
  )
}

export default AuditLogsPage
