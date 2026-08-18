import { boolean, email, literal, maxLength, nonEmpty, object, optional, picklist, pipe, regex, string, trim, union } from 'valibot'

const defaultMessages = {
  required: 'This field is required.',
  emailInvalid: 'Enter a valid company email address.',
  valueTooLong: 'This value is too long.',
  invalidImagePath: 'Select a valid locally uploaded image.',
  invalidTime: 'Enter a valid time in HH:mm format.',
  invalidExchangeRate: 'Enter a valid USD/AFN exchange rate.'
}

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

const requiredText = (messages, length = 191) =>
  pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(length, messages.valueTooLong))

const optionalText = (messages, length = 500) =>
  optional(pipe(string(), trim(), maxLength(length, messages.valueTooLong)), '')

const optionalEmail = messages =>
  optional(
    union([
      literal(''),
      pipe(string(messages.emailInvalid), trim(), email(messages.emailInvalid), maxLength(191, messages.valueTooLong))
    ]),
    ''
  )

const requiredTime = messages =>
  pipe(string(messages.invalidTime), trim(), nonEmpty(messages.required), regex(TIME_PATTERN, messages.invalidTime))

export const createCompanySetupSchema = customMessages => {
  const messages = { ...defaultMessages, ...customMessages }

  return object({
    app_name: requiredText(messages),
    company_name: requiredText(messages),
    company_logo: optionalText(messages, 2000),
    company_email: optionalEmail(messages),
    company_phone: optionalText(messages, 100),
    company_address: optionalText(messages, 2000),
    company_tax_id: optionalText(messages, 191),
    signatory_name: optionalText(messages, 191),
    signatory_title: optionalText(messages, 191),
    signatory_stamp: optionalText(messages, 2000),
    currency_code: picklist(['AFN', 'USD'], messages.required),
    usd_afn_exchange_rate: pipe(
      string(messages.invalidExchangeRate),
      trim(),
      regex(/^\d+(?:\.\d{1,4})?$/, messages.invalidExchangeRate)
    ),
    default_work_start: requiredTime(messages),
    default_work_end: requiredTime(messages),
    lightLogoUrl: optionalText(messages, 2000),
    darkLogoUrl: optionalText(messages, 2000),
    faviconUrl: optionalText(messages, 2000),
    updateNavigationBranding: optional(boolean(), true)
  })
}

export const companySetupSchema = createCompanySetupSchema(defaultMessages)
