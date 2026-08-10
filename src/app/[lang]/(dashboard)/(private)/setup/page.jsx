// View Imports
import SetupView from '@/views/setup/SetupView'

// Server Action Imports
import { getSystemSettings } from '@/app/actions/settingActions'

// Config Imports
import { DEFAULT_BRANDING } from '@/configs/branding'

// Util Imports
import { getDictionary } from '@/utils/getDictionary'

const SetupPage = async props => {
  const params = await props.params
  const [dictionary, settingsResult] = await Promise.all([getDictionary(params.lang), getSystemSettings()])
  const initialSettings = settingsResult.success ? settingsResult.data : DEFAULT_BRANDING

  return <SetupView dictionary={dictionary.setupBranding} initialSettings={initialSettings} locale={params.lang} />
}

export default SetupPage
