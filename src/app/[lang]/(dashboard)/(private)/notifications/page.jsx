import { getDictionary } from '@/utils/getDictionary'
import NotificationsCenterView from '@/views/notifications/NotificationsCenterView'

const NotificationsPage = async props => {
  const { lang } = await props.params
  const dictionary = await getDictionary(lang)

  return <NotificationsCenterView dictionary={dictionary.notifications} />
}

export default NotificationsPage
