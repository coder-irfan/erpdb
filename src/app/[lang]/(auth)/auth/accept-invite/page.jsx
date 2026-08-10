import { getInvitationDetails } from '@/app/actions/invitationActions'
import { getDictionary } from '@/utils/getDictionary'
import { getLocalizedUrl } from '@/utils/i18n'
import AcceptInviteV1 from '@/views/pages/auth/AcceptInviteV1'

export const generateMetadata = async props => {
  const { lang } = await props.params
  const dictionary = await getDictionary(lang)

  return {
    title: dictionary.auth.acceptInvite.metadataTitle,
    description: dictionary.auth.acceptInvite.metadataDescription
  }
}

const AcceptInvitePage = async props => {
  const { lang } = await props.params
  const searchParams = await props.searchParams
  const dictionary = await getDictionary(lang)
  const token = typeof searchParams?.token === 'string' ? searchParams.token : ''
  const invitationResult = await getInvitationDetails({ token, locale: lang })
  const contactEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER
  const contactHref = contactEmail ? `mailto:${contactEmail}` : getLocalizedUrl('/login', lang)

  return (
    <AcceptInviteV1
      dictionary={dictionary.auth.acceptInvite}
      locale={lang}
      token={token}
      invitation={invitationResult.success ? invitationResult.data : null}
      invitationError={invitationResult.success ? null : invitationResult.error}
      contactHref={contactHref}
    />
  )
}

export default AcceptInvitePage
