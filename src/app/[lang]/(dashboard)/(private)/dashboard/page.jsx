import DashboardHome from '@/views/dashboard/DashboardHome'
import { getDashboardData } from '@/actions/dashboard'
import { i18n } from '@/configs/i18n'
import { getDashboardDictionary } from '@/data/dictionaries/dashboard'

export const dynamic = 'force-dynamic'

const DashboardPage = async ({ params }) => {
  const routeParams = await params
  const locale = i18n.locales.includes(routeParams.lang) ? routeParams.lang : i18n.defaultLocale
  const result = await getDashboardData({ locale, period: 'THIS_MONTH' })

  if (!result.success) throw new Error(result.error)

  return <DashboardHome initialData={result.data} dictionary={getDashboardDictionary(locale)} />
}

export default DashboardPage
