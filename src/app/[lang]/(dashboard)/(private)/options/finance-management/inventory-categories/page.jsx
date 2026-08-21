import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import InventoryCategoriesView from '@/views/options/finance/InventoryCategoriesView'

const InventoryCategoriesPage = async props => {
  const { lang } = await props.params
  const [dictionary, session] = await Promise.all([getDictionary(lang), getServerSession(authOptions)])

  return <InventoryCategoriesView locale={lang} dictionary={dictionary.inventoryManagement} canWrite={hasAnyPermission(session, ['options:write', 'finance:write', 'finance_inventory:write'])} canDelete={hasAnyPermission(session, ['options:delete', 'finance:delete', 'finance_inventory:delete'])} />
}

export default InventoryCategoriesPage

