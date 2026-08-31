import {
  date,
  finite,
  integer,
  isoDate,
  literal,
  maxLength,
  minValue,
  nonEmpty,
  number,
  object,
  optional,
  pipe,
  string,
  transform,
  trim,
  union
} from 'valibot'

const defaultMessages = {
  required: 'This field is required.',
  valueTooLong: 'This value is too long.',
  wholeNumberInvalid: 'Enter a whole number of days.',
  dateInvalid: 'Enter a valid date.'
}

const requiredText = (messages, length = 191) =>
  pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(length, messages.valueTooLong))

const optionalText = (messages, length = 2000) =>
  optional(pipe(string(), trim(), maxLength(length, messages.valueTooLong)), '')

const dateValue = messages =>
  union([
    pipe(string(messages.dateInvalid), trim(), nonEmpty(messages.dateInvalid), isoDate(messages.dateInvalid)),
    date(messages.dateInvalid)
  ])

const optionalDateValue = messages =>
  optional(
    union([
      literal(''),
      pipe(string(messages.dateInvalid), trim(), isoDate(messages.dateInvalid)),
      date(messages.dateInvalid)
    ]),
    ''
  )

const nonNegativeIntegerValue = messages =>
  pipe(
    union([
      pipe(number(messages.wholeNumberInvalid), finite(messages.wholeNumberInvalid)),
      pipe(
        string(messages.wholeNumberInvalid),
        trim(),
        nonEmpty(messages.wholeNumberInvalid),
        transform(value => Number(value)),
        number(messages.wholeNumberInvalid),
        finite(messages.wholeNumberInvalid)
      )
    ]),
    integer(messages.wholeNumberInvalid),
    minValue(0, messages.wholeNumberInvalid)
  )

export const createStaffContractSchema = customMessages => {
  const messages = { ...defaultMessages, ...customMessages }

  return object({
    target_category: optional(literal('HRM'), 'HRM'),
    staff_id: requiredText(messages),
    contract_type_id: requiredText(messages),
    template_id: requiredText(messages),
    start_date: dateValue(messages),
    end_date: dateValue(messages),
    document_url: optionalText(messages),
    status_id: requiredText(messages),
    probation_days: optional(nonNegativeIntegerValue(messages), 90),
    notice_period_days: optional(nonNegativeIntegerValue(messages), 30),
    termination_date: optionalDateValue(messages),
    termination_reason: optionalText(messages)
  })
}

export const staffContractSchema = createStaffContractSchema(defaultMessages)
