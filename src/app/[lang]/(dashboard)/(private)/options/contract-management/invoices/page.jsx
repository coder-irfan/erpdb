import { getServerSession } from 'next-auth'

import { getOptionsListPaginated } from '@/actions/options'
import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import ContractOptionsView from '@/views/options/contracts/ContractOptionsView'

// Keep this server-page configuration local. Importing named values from a client
// component can be represented as a module reference during server evaluation.
const INVOICE_OPTION_SECTIONS = [
  { category: 'INVOICE_STATUS', key: 'invoiceStatuses', icon: 'tabler-receipt' },
  { category: 'PAYMENT_METHOD', key: 'paymentMethods', icon: 'tabler-credit-card' }
]

const invoiceOptionSections = Array.isArray(INVOICE_OPTION_SECTIONS) ? INVOICE_OPTION_SECTIONS : []
const CATEGORIES = invoiceOptionSections.map(section => section.category)

const InvoiceOptionsPage = async props => {
  const { lang } = await props.params

  const [dictionary, session, ...results] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    ...CATEGORIES.map(category => getOptionsListPaginated({ category, page: 1, limit: 100, locale: lang }))
  ])

  return (
    <ContractOptionsView
      initialData={Object.fromEntries(
        CATEGORIES.map((category, index) => [category, results[index].success ? results[index].data.options : []])
      )}
      canWrite={hasAnyPermission(session, ['options:write'])}
      canDelete={hasAnyPermission(session, ['options:write', 'options:delete'])}
      locale={lang}
      dictionary={dictionary.contractOptions}
      managementDictionary={dictionary.optionsManagement}
      sections={invoiceOptionSections}
    />
  )
}

export default InvoiceOptionsPage
