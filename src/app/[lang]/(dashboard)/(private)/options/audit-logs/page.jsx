import { getAuditLogsPage } from '@/actions/notifications'
import { getDictionary } from '@/utils/getDictionary'
import AuditLogsView from '@/views/setup/audit-logs/AuditLogsView'

const AuditLogsPage = async props => {
  const { lang } = await props.params
  const [dictionary, result] = await Promise.all([getDictionary(lang), getAuditLogsPage({ page: 1, limit: 10 })])

  return (
    <AuditLogsView
      initialResult={result.success ? result.data : { logs: [], totalCount: 0, page: 1, totalPages: 1, canDelete: false }}
      initialError={result.success ? null : result.error}
      locale={lang}
      dictionary={dictionary.notifications}
    />
  )
}

export default AuditLogsPage
