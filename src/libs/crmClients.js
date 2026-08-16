import 'server-only'

export const CRM_CLIENT_READ_PERMISSIONS = ['crm:read', 'crm_client:read']
export const CRM_CLIENT_WRITE_PERMISSIONS = ['crm:write', 'crm_client:write']
export const CRM_CLIENT_DELETE_PERMISSIONS = ['crm:delete', 'crm_client:delete']

const normalizeStaff = staff =>
  staff ? { ...staff, full_name: `${staff.first_name} ${staff.last_name}`.trim() } : null

const normalizeActivity = activity => ({
  ...activity,
  activity_date: activity.activity_date.toISOString(),
  due_date: activity.due_date?.toISOString() || null,
  created_at: activity.created_at?.toISOString() || null,
  staff: normalizeStaff(activity.staff)
})

export const normalizeClientListItem = client => ({
  ...client,
  created_at: client.created_at.toISOString(),
  updated_at: client.updated_at.toISOString(),
  account_manager: normalizeStaff(client.account_manager),
  total_revenue: client.invoices
    .filter(invoice => invoice.status.value === 'PAID')
    .reduce((total, invoice) => total + Number(invoice.amount || 0), 0)
    .toFixed(2),
  invoices: undefined
})

export const normalizeClientDetail = client => {
  const leadActivities = client.lead?.activities || []

  const activities = [...client.activities, ...leadActivities]
    .filter((activity, index, all) => all.findIndex(item => item.id === activity.id) === index)
    .sort((left, right) => right.activity_date.getTime() - left.activity_date.getTime())
    .map(normalizeActivity)

  return {
    ...client,
    created_at: client.created_at.toISOString(),
    updated_at: client.updated_at.toISOString(),
    account_manager: normalizeStaff(client.account_manager),
    projects: client.projects.map(project => ({
      ...project,
      budget: project.budget.toFixed(2),
      start_date: project.start_date.toISOString(),
      end_date: project.end_date.toISOString()
    })),
    contracts: client.contracts.map(contract => ({
      ...contract,
      total_amount: contract.total_amount.toFixed(2),
      start_date: contract.start_date.toISOString(),
      end_date: contract.end_date.toISOString()
    })),
    invoices: client.invoices.map(invoice => ({
      ...invoice,
      amount: invoice.amount.toFixed(2),
      issued_date: invoice.issued_date.toISOString(),
      due_date: invoice.due_date.toISOString()
    })),
    activities,
    lead: client.lead ? { ...client.lead, activities: undefined } : null
  }
}

