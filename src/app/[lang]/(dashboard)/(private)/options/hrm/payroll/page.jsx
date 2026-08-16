import { getServerSession } from 'next-auth'

import { getOptionsListPaginated } from '@/actions/options'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import PayrollOptionsView from '@/views/options/hrm/PayrollOptionsView'

const PayrollOptionsPage = async props => {
  const { lang } = await props.params

  const [dictionary, session, statuses, paymentMethods] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    getOptionsListPaginated({ category: 'PAYROLL_STATUS', page: 1, limit: 100, locale: lang }),
    getOptionsListPaginated({ category: 'PAYROLL_PAYMENT_METHOD', page: 1, limit: 100, locale: lang })
  ])

  return (
    <PayrollOptionsView
      initialData={{
        PAYROLL_STATUS: statuses.success ? statuses.data.options : [],
        PAYROLL_PAYMENT_METHOD: paymentMethods.success ? paymentMethods.data.options : []
      }}
      canWrite={hasAnyPermission(session, ['options:write'])}
      canDelete={hasAnyPermission(session, ['options:write', 'options:delete'])}
      locale={lang}
      dictionary={dictionary.payrollOptions}
      managementDictionary={dictionary.optionsManagement}
    />
  )
}

export default PayrollOptionsPage
