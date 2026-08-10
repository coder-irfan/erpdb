import {
  boolean,
  check,
  email,
  forward,
  minLength,
  nonEmpty,
  object,
  optional,
  pipe,
  string,
  toLowerCase,
  trim
} from 'valibot'

const createEmailSchema = messages =>
  pipe(
    string(messages.emailRequired),
    trim(),
    nonEmpty(messages.emailRequired),
    email(messages.emailInvalid),
    toLowerCase()
  )

const createPasswordSchema = messages => pipe(string(messages.passwordRequired), nonEmpty(messages.passwordRequired))

export const createLoginSchema = messages =>
  object({
    email: createEmailSchema(messages),
    password: createPasswordSchema(messages),
    rememberMe: optional(boolean(), false)
  })

export const createForgotPasswordSchema = messages =>
  object({
    email: createEmailSchema(messages)
  })

export const createResetPasswordSchema = messages =>
  pipe(
    object({
      token: pipe(string(messages.resetTokenRequired), trim(), nonEmpty(messages.resetTokenRequired)),
      password: pipe(createPasswordSchema(messages), minLength(8, messages.passwordMinLength)),
      confirmPassword: pipe(
        string(messages.passwordConfirmationRequired),
        nonEmpty(messages.passwordConfirmationRequired),
        minLength(8, messages.passwordConfirmationMinLength)
      )
    }),
    forward(
      check(input => input.password === input.confirmPassword, messages.passwordsDoNotMatch),
      ['confirmPassword']
    )
  )
