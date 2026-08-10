import {
  array,
  email,
  maxLength,
  minLength,
  nonEmpty,
  nullable,
  object,
  optional,
  picklist,
  pipe,
  regex,
  string,
  toLowerCase,
  trim,
  union,
  literal
} from 'valibot'

const createRequiredString = (message, max, maxMessage) =>
  pipe(string(message), trim(), nonEmpty(message), maxLength(max, maxMessage))

const createIdSchema = message => pipe(string(message), trim(), nonEmpty(message))

export const createRolePermissionSchema = messages =>
  object({
    roleId: createIdSchema(messages.roleRequired),
    permissionIds: array(createIdSchema(messages.permissionInvalid))
  })

export const createRoleSchema = messages =>
  object({
    name: pipe(
      createRequiredString(messages.roleNameRequired, 50, messages.roleNameTooLong),
      minLength(3, messages.roleNameTooShort),
      regex(/^[a-z][a-z0-9_]*$/, messages.roleNameFormat)
    ),
    displayName: pipe(
      createRequiredString(messages.displayNameRequired, 80, messages.displayNameTooLong),
      minLength(2, messages.displayNameTooShort)
    ),
    description: optional(pipe(string(), trim(), maxLength(500, messages.descriptionTooLong)), ''),
    permissionIds: array(createIdSchema(messages.permissionInvalid))
  })

export const createInviteUserSchema = messages =>
  object({
    name: pipe(
      createRequiredString(messages.fullNameRequired, 100, messages.fullNameTooLong),
      minLength(2, messages.fullNameTooShort)
    ),
    email: pipe(
      createRequiredString(messages.emailRequired, 191, messages.emailTooLong),
      email(messages.emailInvalid),
      toLowerCase()
    ),
    roleId: createIdSchema(messages.roleRequired),
    staffId: optional(nullable(union([literal(''), createIdSchema(messages.staffInvalid)])), null)
  })

export const createUserStatusSchema = messages =>
  object({
    userId: createIdSchema(messages.userRequired),
    status: picklist(['ACTIVE', 'INACTIVE', 'SUSPENDED'], messages.statusInvalid)
  })

export const createAssignUserRoleSchema = messages =>
  object({
    userId: createIdSchema(messages.userRequired),
    roleId: createIdSchema(messages.roleRequired)
  })
