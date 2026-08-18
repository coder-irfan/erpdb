import {
  date,
  email,
  finite,
  isoDate,
  literal,
  maxLength,
  minValue,
  nonEmpty,
  nullable,
  number,
  object,
  optional,
  picklist,
  pipe,
  string,
  toLowerCase,
  transform,
  trim,
  union
} from 'valibot'

export const STAFF_STATUSES = ['ACTIVE', 'INACTIVE', 'TERMINATED']

const defaultMessages = {
  required: 'This field is required.',
  emailInvalid: 'Enter a valid email address.',
  emailTooLong: 'Email must not exceed 191 characters.',
  valueTooLong: 'This value is too long.',
  salaryInvalid: 'Enter a valid salary.',
  salaryPositive: 'Salary must be greater than zero.',
  joinDateInvalid: 'Enter a valid joining date.',
  statusInvalid: 'Select a valid staff status.',
  userInvalid: 'Select a valid system user.'
}

const requiredText = (messages, maxLengthValue = 191) =>
  pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(maxLengthValue, messages.valueTooLong))

const optionalText = (messages, maxLengthValue = 500) =>
  optional(pipe(string(), trim(), maxLength(maxLengthValue, messages.valueTooLong)), '')

const salaryValue = messages =>
  pipe(
    union([
      pipe(number(messages.salaryInvalid), finite(messages.salaryInvalid)),
      pipe(
        string(messages.salaryInvalid),
        trim(),
        nonEmpty(messages.salaryInvalid),
        transform(value => Number(value)),
        number(messages.salaryInvalid),
        finite(messages.salaryInvalid)
      )
    ]),
    minValue(0.01, messages.salaryPositive)
  )

const joinDateValue = messages =>
  union([
    pipe(
      string(messages.joinDateInvalid),
      trim(),
      nonEmpty(messages.joinDateInvalid),
      isoDate(messages.joinDateInvalid)
    ),
    date(messages.joinDateInvalid)
  ])

export const createStaffSchema = customMessages => {
  const messages = { ...defaultMessages, ...customMessages }

  return object({
    first_name: requiredText(messages, 100),
    last_name: requiredText(messages, 100),
    father_name: optionalText(messages, 100),
    phone: requiredText(messages, 50),
    email: pipe(
      string(messages.required),
      trim(),
      nonEmpty(messages.required),
      email(messages.emailInvalid),
      maxLength(191, messages.emailTooLong),
      toLowerCase()
    ),
    address: optionalText(messages, 2000),
    educations: optionalText(messages, 2000),
    tazkira_no: optionalText(messages, 100),
    position: requiredText(messages, 150),
    salary: salaryValue(messages),
    salary_currency: picklist(['AFN', 'USD'], messages.currencyInvalid || messages.required),
    guarantor_name: optionalText(messages, 100),
    guarantor_phone: optionalText(messages, 50),
    guarantor_license: optionalText(messages, 150),
    join_date: joinDateValue(messages),
    contract_period: optionalText(messages, 100),
    user_id: optional(
      nullable(union([literal(''), pipe(string(messages.userInvalid), trim(), nonEmpty(messages.userInvalid))])),
      null
    ),
    status: optional(picklist(STAFF_STATUSES, messages.statusInvalid), 'ACTIVE')
  })
}

export const staffSchema = createStaffSchema(defaultMessages)
