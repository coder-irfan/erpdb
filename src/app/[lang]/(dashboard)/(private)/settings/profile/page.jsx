import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'

import { getCurrentUserProfile } from '@/app/actions/profileActions'
import { getDictionary } from '@/utils/getDictionary'
import ProfileView from '@/views/settings/profile/ProfileView'

const ProfilePage = async props => {
  const { lang } = await props.params
  const dictionary = await getDictionary(lang)
  const profileResult = await getCurrentUserProfile({ locale: lang })

  if (!profileResult.success) {
    return (
      <Card>
        <CardContent>
          <Alert severity='error'>{profileResult.error}</Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <ProfileView
      initialProfile={profileResult.data}
      dictionary={dictionary.profile}
      uploadTranslations={dictionary.setupBranding.upload}
      locale={lang}
    />
  )
}

export default ProfilePage
