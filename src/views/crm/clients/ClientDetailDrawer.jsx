'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const localeMap = { en: 'en-US', fa: 'fa-AF', ps: 'ps-AF' }

const formatDate = (value, locale) =>
  value
    ? new Intl.DateTimeFormat(localeMap[locale] || localeMap.en, { dateStyle: 'medium' }).format(new Date(value))
    : '—'

const EmptyPanel = ({ icon, title }) => (
  <div className='rounded border border-dashed border-divider p-10 text-center'>
    <i className={`${icon} text-5xl text-textDisabled`} />
    <Typography className='mt-3' color='text.secondary'>
      {title}
    </Typography>
  </div>
)

const Info = ({ label, children }) => (
  <div>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography className='mt-1 font-medium' color='text.primary'>
      {children || '—'}
    </Typography>
  </div>
)

const ClientProfileModal = ({
  open,
  clientId,
  locale,
  currencyCode,
  dictionary,
  canWrite,
  onClose,
  onEdit,
  onActivity
}) => {
  const [tab, setTab] = useState(0)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadClient = useCallback(async () => {
    if (!clientId) return
    setLoading(true)

    try {
      const response = await fetch(`/api/crm/clients/${clientId}?locale=${locale}`, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.loadFailed)
      setClient(result.data)
    } catch {
      toast.error(dictionary.messages.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [clientId, dictionary.messages.loadFailed, locale])

  useEffect(() => {
    if (open) {
      setTab(0)
      loadClient()
    } else setClient(null)
  }, [loadClient, open])

  const invoicePaid =
    client?.invoices
      .filter(invoice => invoice.status.value === 'PAID')
      .reduce((sum, invoice) => sum + toFiniteNumber(invoice.amount_base), 0) || 0

  const invoicePending =
    client?.invoices
      .filter(invoice => invoice.status.value !== 'PAID')
      .reduce((sum, invoice) => sum + toFiniteNumber(invoice.amount_base), 0) || 0

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='lg'
      scroll='paper'
      transitionDuration={300}
      slotProps={{ paper: { className: 'min-bs-[70vh] max-bs-[92vh]' } }}
    >
      <div className='flex items-start justify-between gap-4 border-be border-divider p-5'>
        {client ? (
          <div className='flex min-w-0 items-center gap-3'>
            <Avatar className='size-14 bg-primaryLighter text-primary'>{client.company_name.slice(0, 1)}</Avatar>
            <div>
              <div className='flex flex-wrap items-center gap-2'>
                <Typography variant='h5'>{client.company_name}</Typography>
                <Chip
                  size='small'
                  variant='tonal'
                  color={client.status === 'ACTIVE' ? 'success' : 'secondary'}
                  label={dictionary.status[client.status] || client.status}
                />
              </div>
              <Typography color='text.secondary'>
                {client.primary_contact_name} · {client.email}
              </Typography>
            </div>
          </div>
        ) : (
          <Typography variant='h5'>{dictionary.detail.title}</Typography>
        )}
        <div className='flex gap-1'>
          {client && canWrite && (
            <>
              <IconButton title={dictionary.actions.activity} onClick={() => onActivity(client)}>
                <i className='tabler-activity' />
              </IconButton>
              <IconButton title={dictionary.actions.edit} onClick={() => onEdit(client)}>
                <i className='tabler-edit' />
              </IconButton>
            </>
          )}
          <IconButton onClick={onClose}>
            <i className='tabler-x' />
          </IconButton>
        </div>
      </div>
      <DialogContent dividers className='flex min-bs-0 flex-1 flex-col p-0'>
        {loading || !client ? (
          <div className='flex flex-1 items-center justify-center p-12'>
            <CircularProgress />
          </div>
        ) : (
          <>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              variant='scrollable'
              className='border-be border-divider px-3'
            >
              <Tab icon={<i className='tabler-address-book' />} iconPosition='start' label={dictionary.tabs.overview} />
              <Tab
                icon={<i className='tabler-briefcase' />}
                iconPosition='start'
                label={dictionary.tabs.relationships}
              />
              <Tab icon={<i className='tabler-receipt' />} iconPosition='start' label={dictionary.tabs.finance} />
              <Tab icon={<i className='tabler-history' />} iconPosition='start' label={dictionary.tabs.activity} />
            </Tabs>
            <div className='flex-1 overflow-y-auto p-5'>
              {tab === 0 && (
                <div className='flex flex-col md:gap-4 gap-2'>
                  <div className='grid grid-cols-1 gap-5 rounded border border-divider p-5 sm:grid-cols-2'>
                    <Info label={dictionary.fields.contact}>{client.primary_contact_name}</Info>
                    <Info label={dictionary.fields.email}>{client.email}</Info>
                    <Info label={dictionary.fields.phone}>{client.phone}</Info>
                    <Info label={dictionary.fields.tax}>{client.tax_id}</Info>
                    <Info label={dictionary.fields.address}>{client.address}</Info>
                    <Info label={dictionary.fields.created}>{formatDate(client.created_at, locale)}</Info>
                  </div>
                  <div className='rounded border border-divider p-5'>
                    <Typography variant='h6' className='mb-4'>
                      {dictionary.detail.manager}
                    </Typography>
                    {client.account_manager ? (
                      <div className='flex min-is-[220px] items-center gap-3'>
                        <Avatar variant='rounded' className='bg-primaryLighter text-primary'></Avatar>
                        <div>
                          <Typography className='font-medium'>{client.account_manager.full_name}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {client.account_manager.position} · {client.account_manager.email}
                          </Typography>
                        </div>
                      </div>
                    ) : (
                      <Typography color='text.secondary'>{dictionary.placeholders.manager}</Typography>
                    )}
                  </div>
                  {client.lead && (
                    <div className='rounded border border-primary/20 bg-primaryLighter p-5'>
                      <Typography variant='h6'>{dictionary.detail.leadOrigin}</Typography>
                      <Typography className='mt-2'>{client.lead.title}</Typography>
                      <Chip
                        className='mt-2'
                        size='small'
                        variant='tonal'
                        color='primary'
                        label={client.lead.source.label}
                      />
                    </div>
                  )}
                  {client.notes && (
                    <div className='rounded border border-divider p-5'>
                      <Typography variant='h6'>{dictionary.fields.notes}</Typography>
                      <Typography className='mt-2 whitespace-pre-line' color='text.secondary'>
                        {client.notes}
                      </Typography>
                    </div>
                  )}
                </div>
              )}
              {tab === 1 && (
                <div className='flex flex-col md:gap-4 gap-2'>
                  <section>
                    <Typography variant='h6' className='mb-3'>
                      {dictionary.detail.projects}
                    </Typography>
                    {client.projects.length ? (
                      <div className='flex flex-col gap-3'>
                        {client.projects.map(project => (
                          <div
                            key={project.id}
                            className='flex flex-wrap items-center justify-between gap-3 rounded border border-divider p-4'
                          >
                            <div>
                              <Typography className='font-semibold'>{project.title}</Typography>
                              <Typography variant='body2' color='text.secondary'>
                                {project.project_code} · {formatDate(project.start_date, locale)} —{' '}
                                {formatDate(project.end_date, locale)}
                              </Typography>
                            </div>
                            <div className='text-end'>
                              <Chip size='small' variant='tonal' color='primary' label={project.status.label} />
                              <Typography className='mt-1 font-medium text-success'>
                                {formatCurrency(project.budget, locale, project.currency || currencyCode)}
                              </Typography>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel icon='tabler-briefcase-off' title={dictionary.empty.projects} />
                    )}
                  </section>
                  <section>
                    <Typography variant='h6' className='mb-3'>
                      {dictionary.detail.contracts}
                    </Typography>
                    {client.contracts.length ? (
                      <div className='flex flex-col gap-3'>
                        {client.contracts.map(contract => (
                          <div
                            key={contract.id}
                            className='flex flex-wrap items-center justify-between gap-3 rounded border border-divider p-4'
                          >
                            <div>
                              <Typography className='font-semibold'>{contract.title}</Typography>
                              <Typography variant='body2' color='text.secondary'>
                                {contract.contract_number} · {formatDate(contract.start_date, locale)} —{' '}
                                {formatDate(contract.end_date, locale)}
                              </Typography>
                            </div>
                            <div className='text-end'>
                              <Chip size='small' variant='tonal' color='info' label={contract.status.label} />
                              <Typography className='mt-1 font-medium'>
                                {formatCurrency(contract.total_amount, locale, contract.currency || currencyCode)}
                              </Typography>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel icon='tabler-file-off' title={dictionary.empty.contracts} />
                    )}
                  </section>
                </div>
              )}
              {tab === 2 && (
                <div className='flex flex-col gap-5'>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div className='rounded bg-successLighter p-4'>
                      <Typography color='success.main'>{dictionary.detail.paidRevenue}</Typography>
                      <Typography variant='h5' className='mt-1 text-success'>
                        {formatCurrency(invoicePaid, locale, currencyCode)}
                      </Typography>
                    </div>
                    <div className='rounded bg-errorLighter p-4'>
                      <Typography color='warning.main'>{dictionary.detail.pendingInvoices}</Typography>
                      <Typography variant='h5' className='mt-1 text-warning'>
                        {formatCurrency(invoicePending, locale, currencyCode)}
                      </Typography>
                    </div>
                  </div>
                  {client.invoices.length ? (
                    <div className='no-scrollbar overflow-x-auto scroll-smooth rounded border border-divider'>
                      <table className='w-full'>
                        <thead>
                          <tr className='border-be border-divider bg-actionHover'>
                            <th className='p-3 text-start'>{dictionary.detail.invoice}</th>
                            <th className='p-3 text-start'>{dictionary.table.status}</th>
                            <th className='p-3 text-start'>{dictionary.detail.dueDate}</th>
                            <th className='p-3 text-end'>{dictionary.detail.amount}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {client.invoices.map(invoice => (
                            <tr
                              key={invoice.id}
                              className='border-be border-divider transition-colors hover:bg-actionHover'
                            >
                              <td className='p-3 font-medium'>{invoice.invoice_number}</td>
                              <td className='p-3'>
                                <Chip
                                  size='small'
                                  variant='tonal'
                                  color={invoice.status.value === 'PAID' ? 'success' : 'warning'}
                                  label={invoice.status.label}
                                />
                              </td>
                              <td className='p-3'>{formatDate(invoice.due_date, locale)}</td>
                              <td className='p-3 text-end font-semibold'>
                                {formatCurrency(invoice.amount, locale, invoice.currency || currencyCode)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyPanel icon='tabler-receipt-off' title={dictionary.empty.invoices} />
                  )}
                </div>
              )}
              {tab === 3 && (
                <div>
                  {client.activities.length ? (
                    <div className='flex flex-col md:gap-4 gap-2'>
                      {client.activities.map(activity => (
                        <div key={activity.id} className='flex gap-3 border-bs-2 border-primary/20 ps-4 pt-4'>
                          <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primaryLighter text-primary'>
                            <i className='tabler-activity' />
                          </span>
                          <div className=''>
                            <div className='flex flex-wrap items-center gap-2'>
                              <Typography className='font-semibold'>{activity.title}</Typography>
                              <Chip
                                size='small'
                                variant='tonal'
                                color='primary'
                                label={dictionary.activity.types[activity.activity_type] || activity.activity_type}
                              />
                            </div>
                            <Typography variant='body2' color='text.secondary'>
                              {activity.staff?.full_name || '—'} · {formatDate(activity.activity_date, locale)}
                            </Typography>
                            {activity.description && (
                              <Typography className='mt-2 whitespace-pre-line'>{activity.description}</Typography>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel icon='tabler-history-off' title={dictionary.empty.activities} />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
      <div className='border-bs border-divider p-4 text-end'>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {dictionary.actions.close}
        </Button>
      </div>
    </Dialog>
  )
}

export default ClientProfileModal
