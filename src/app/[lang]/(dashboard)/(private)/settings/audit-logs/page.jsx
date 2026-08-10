import { redirect } from 'next/navigation'

const LegacyAuditLogsPage = async props => {
  const { lang } = await props.params

  redirect(`/${lang}/setup/audit-logs`)
}

export default LegacyAuditLogsPage
