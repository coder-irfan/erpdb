import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { getKabulToday } from '@/libs/hrmTimesheets'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import TimesheetsView from '@/views/hrm/timesheets/TimesheetsView'

const TimesheetsPage = async props => {
  const { lang } = await props.params

  const [dictionary, session, setup] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    getCompanySetupRecord()
  ])

  return (
    <TimesheetsView
      initialDate={getKabulToday()}
      canWrite={hasAnyPermission(session, ['hrm:write', 'hrm_timesheet:write'])}
      canDelete={hasAnyPermission(session, ['hrm:delete', 'hrm_timesheet:delete'])}
      defaultWorkHours={{ start: setup.default_work_start, end: setup.default_work_end }}
      locale={lang}
      dictionary={dictionary.hrmTimesheets}
    />
  )
}

export default TimesheetsPage
