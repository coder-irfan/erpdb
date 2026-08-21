import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { getDictionary } from '@/utils/getDictionary'
import { hasAnyPermission } from '@/utils/rbac'
import InventoryManagementView from '@/views/finance/inventory/InventoryManagementView'

const InventoryPage = async props => {
  const { lang } = await props.params
  const [dictionary, session] = await Promise.all([getDictionary(lang), getServerSession(authOptions)])

  return <InventoryManagementView locale={lang} dictionary={dictionary.inventoryManagement} canWrite={hasAnyPermission(session, ['finance:write', 'finance_inventory:write'])} canDelete={hasAnyPermission(session, ['finance:delete', 'finance_inventory:delete'])} />
}

export default InventoryPage
