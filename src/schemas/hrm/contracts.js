import {
  date,
  finite,
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
  salaryInvalid: 'Enter a valid salary.',
  salaryPositive: 'Salary must be greater than zero.',
  dateInvalid: 'Enter a valid date.'
}

const requiredText = (messages, length = 191) =>
  pipe(string(messages.required), trim(), nonEmpty(messages.required), maxLength(length, messages.valueTooLong))

const optionalText = (messages, length = 2000) =>
  optional(pipe(string(), trim(), maxLength(length, messages.valueTooLong)), '')

const dateValue = messages =>
  union([pipe(string(messages.dateInvalid), trim(), nonEmpty(messages.dateInvalid), isoDate(messages.dateInvalid)), date(messages.dateInvalid)])

const optionalDateValue = messages =>
  optional(
    union([literal(''), pipe(string(messages.dateInvalid), trim(), isoDate(messages.dateInvalid)), date(messages.dateInvalid)]),
    ''
  )

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

export const createStaffContractSchema = customMessages => {
  const messages = { ...defaultMessages, ...customMessages }

  return object({
    staff_id: requiredText(messages),
    contract_type_id: requiredText(messages),
    position_title: requiredText(messages),
    base_salary: salaryValue(messages),
    start_date: dateValue(messages),
    end_date: optionalDateValue(messages),
    document_url: optionalText(messages),
    status_id: requiredText(messages)
  })
}

export const staffContractSchema = createStaffContractSchema(defaultMessages)
