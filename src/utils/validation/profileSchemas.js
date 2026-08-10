import {
  check,
  email,
  forward,
  maxLength,
  minLength,
  nonEmpty,
  nullable,
  object,
  optional,
  picklist,
  pipe,
  string,
  toLowerCase,
  trim
} from 'valibot'

export const createProfileAccountSchema = messages =>
  object({
    name: pipe(
      string(messages.nameRequired),
      trim(),
      nonEmpty(messages.nameRequired),
      minLength(2, messages.nameTooShort),
      maxLength(100, messages.nameTooLong)
    ),
    email: pipe(
      string(messages.emailRequired),
      trim(),
      nonEmpty(messages.emailRequired),
      email(messages.emailInvalid),
      maxLength(191, messages.emailTooLong),
      toLowerCase()
    ),
    locale: picklist(['en', 'fa', 'ps'], messages.localeInvalid),
    image: optional(nullable(pipe(string(), trim(), maxLength(500, messages.imageInvalid))), null)
  })

export const createChangePasswordSchema = messages =>
  pipe(
    object({
      currentPassword: pipe(
        string(messages.currentPasswordRequired),
        nonEmpty(messages.currentPasswordRequired)
      ),
      newPassword: pipe(
        string(messages.newPasswordRequired),
        nonEmpty(messages.newPasswordRequired),
        minLength(8, messages.passwordMinLength)
      ),
      confirmPassword: pipe(
        string(messages.confirmPasswordRequired),
        nonEmpty(messages.confirmPasswordRequired)
      )
    }),
    forward(check(input => input.newPassword === input.confirmPassword, messages.passwordsDoNotMatch), [
      'confirmPassword'
    ]),
    forward(check(input => input.newPassword !== input.currentPassword, messages.passwordUnchanged), ['newPassword'])
  )
