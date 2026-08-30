export const CONTRACT_TEMPLATE_TOKEN_GROUPS = [
  {
    id: 'staff',
    label: 'Staff and personal details',
    tokens: [
      { key: 'name', label: 'Full name', description: 'Inserts the staff or contact full name' },
      { key: 'first_name', label: 'First name', description: 'Inserts the staff first name' },
      { key: 'last_name', label: 'Last name', description: 'Inserts the staff last name' },
      { key: 'father_name', label: "Father's name", description: "Inserts the staff father's name" },
      { key: 'tazkira', label: 'National ID number', description: 'Inserts the staff national ID number' },
      { key: 'position', label: 'Position or role', description: 'Inserts the staff position or contract role' },
      { key: 'email', label: 'Email address', description: 'Inserts the staff or contact email address' },
      { key: 'phone', label: 'Phone number', description: 'Inserts the staff or contact phone number' },
      { key: 'address', label: 'Address', description: 'Inserts the staff or contact address' },
      { key: 'join_date', label: 'Joining date', description: 'Inserts the staff joining date' },
      { key: 'probation_period', label: 'Probation period', description: 'Inserts the agreed probation period' },
      { key: 'contract_period', label: 'Employment period', description: 'Inserts the staff employment period' }
    ]
  },
  {
    id: 'client-project',
    label: 'Client and project details',
    tokens: [
      { key: 'company_name', label: 'Company name', description: 'Inserts the client or contracting company name' },
      { key: 'contact_name', label: 'Primary contact name', description: 'Inserts the client primary contact name' },
      { key: 'client_email', label: 'Client email', description: 'Inserts the client email address' },
      { key: 'client_phone', label: 'Client phone', description: 'Inserts the client phone number' },
      { key: 'client_address', label: 'Client address', description: 'Inserts the client postal address' },
      { key: 'tax_id', label: 'Client tax ID', description: 'Inserts the client tax identification number' },
      { key: 'project_name', label: 'Project name', description: 'Inserts the project title' },
      { key: 'project_code', label: 'Project code', description: 'Inserts the project reference code' },
      { key: 'project_area', label: 'Project area', description: 'Inserts the project delivery area' },
      { key: 'project_sponsor', label: 'Project sponsor', description: 'Inserts the project sponsor name' },
      { key: 'project_manager', label: 'Project manager', description: 'Inserts the project manager name' },
      { key: 'project_start_date', label: 'Project start date', description: 'Inserts the project start date' },
      { key: 'project_end_date', label: 'Project end date', description: 'Inserts the planned project end date' }
    ]
  },
  {
    id: 'contract-finance',
    label: 'Contract, payment, and dates',
    tokens: [
      { key: 'contract_number', label: 'Contract number', description: 'Inserts the generated contract reference number' },
      { key: 'contract_title', label: 'Contract title', description: 'Inserts the contract title' },
      { key: 'contract_type', label: 'Contract type', description: 'Inserts the selected contract type' },
      { key: 'amount', label: 'Contract amount', description: 'Inserts the agreed monetary amount' },
      { key: 'monthly_salary', label: 'Monthly salary', description: 'Inserts the staff monthly salary and currency' },
      { key: 'base_salary', label: 'Base salary', description: 'Inserts the staff base salary and currency' },
      { key: 'currency', label: 'Currency', description: 'Inserts the contract currency code' },
      { key: 'exchange_rate', label: 'Exchange rate', description: 'Inserts the locked contract exchange rate' },
      { key: 'amount_base', label: 'Base-currency salary', description: 'Inserts the salary converted to company base currency' },
      { key: 'notice_period', label: 'Notice period', description: 'Inserts the required termination or resignation notice period' },
      { key: 'payment_terms', label: 'Payment terms', description: 'Inserts the agreed payment terms' },
      { key: 'start_date', label: 'Contract start date', description: 'Inserts the contract start date' },
      { key: 'end_date', label: 'Contract end date', description: 'Inserts the contract end date' },
      { key: 'signed_date', label: 'Signature date', description: 'Inserts the contract signature date' },
      { key: 'created_date', label: 'Created date', description: 'Inserts the date the document was created' }
    ]
  },
  {
    id: 'organization',
    label: 'Organization details',
    tokens: [
      { key: 'org_name', label: 'Organization name', description: 'Inserts your organization name' },
      { key: 'org_address', label: 'Organization address', description: 'Inserts your organization address' },
      { key: 'org_email', label: 'Organization email', description: 'Inserts your organization email address' },
      { key: 'org_phone', label: 'Organization phone', description: 'Inserts your organization phone number' },
      { key: 'org_tax_id', label: 'Organization tax ID', description: 'Inserts your organization tax identification number' },
      { key: 'signatory_name', label: 'Authorized signatory', description: 'Inserts the authorized signatory name' },
      { key: 'signatory_title', label: 'Signatory title', description: 'Inserts the authorized signatory job title' }
    ]
  }
]

export const contractTemplateToken = key => `{{${key}}}`

export const replaceContractTemplateTokens = (template, replacements, transform = value => String(value ?? '')) =>
  String(template || '').replace(/\{\{([a-z][a-z0-9_]*)\}\}/gi, (token, key) =>
    Object.prototype.hasOwnProperty.call(replacements, key) ? transform(replacements[key]) : token
  )
