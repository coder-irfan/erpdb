'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import { assignProjectMember, getProjectDetail, removeProjectMember, updateProjectContract } from '@/actions/projects'
import UserAvatar from '@/components/common/UserAvatar'
import ResponsiveDataTable from '@/components/tables/ResponsiveDataTable'
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const COLORS = { ACTIVE: 'success', IN_PROGRESS: 'primary', PLANNING: 'info', ON_HOLD: 'warning', COMPLETED: 'success', CANCELLED: 'secondary' }
const PALETTE_COLORS = new Set(['primary', 'secondary', 'success', 'error', 'info', 'warning'])

const statusChipProps = option => {
  const configuredColor = option?.color_code?.toLowerCase()

  if (PALETTE_COLORS.has(configuredColor)) return { color: configuredColor }
  if (/^#[0-9a-f]{6}$/i.test(configuredColor || '')) return { sx: { color: configuredColor, backgroundColor: `${configuredColor}18` } }

  return { color: COLORS[option?.value] || 'default' }
}

const Item = ({ label, value, accent }) => <div><Typography variant='caption' color='text.secondary'>{label}</Typography><Typography className={`mt-1 break-words ${accent || ''}`}>{value || '—'}</Typography></div>

const EmptyPanel = ({ icon, text }) => <div className='flex min-bs-[240px] flex-col items-center justify-center text-center'><i className={`${icon} mb-3 text-4xl text-textDisabled`} /><Typography color='text.secondary'>{text}</Typography></div>

const ProjectTimesheetTable = ({ rows, dictionary }) => (
  <ResponsiveDataTable
    mobileRows={rows}
    getMobileRowId={row => row.id}
    renderMobilePrimary={row => <Typography className='font-medium'>{row.staff.full_name}</Typography>}
    mobileMetadata={[
      { id: 'date', label: dictionary.detail.date, render: row => toDateInputValue(row.date) },
      { id: 'hours', label: dictionary.detail.hours, render: row => `${row.hours_worked || 0}h` },
      { id: 'note', label: dictionary.detail.note, render: row => row.notes || '—' }
    ]}
  >
    <div className='no-scrollbar overflow-x-auto'>
      <table className='w-full'>
        <thead><tr className='border-be border-divider text-start'><th className='p-3'>{dictionary.detail.staff}</th><th className='p-3'>{dictionary.detail.date}</th><th className='p-3'>{dictionary.detail.hours}</th><th className='p-3'>{dictionary.detail.note}</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className='border-be border-divider'><td className='p-3'><Typography variant='body2'>{row.staff.full_name}</Typography></td><td className='p-3'>{toDateInputValue(row.date)}</td><td className='p-3'>{row.hours_worked || 0}h</td><td className='max-is-[280px] p-3'><Typography variant='body2' className='truncate'>{row.notes || '—'}</Typography></td></tr>)}</tbody>
      </table>
    </div>
  </ResponsiveDataTable>
)

const ProjectFinanceTable = ({ project, dictionary, locale }) => {
  const rows = [
    ...project.incomes.map(row => ({ ...row, rowType: 'income', note: row.name, date: row.created_at, amount: row.total_amount })),
    ...project.expenses.map(row => ({ ...row, rowType: 'expense', note: row.details, date: row.expense_date, amount: row.sub_total }))
  ]

  const typeChip = row => <Chip size='small' variant='tonal' color={row.rowType === 'income' ? 'success' : 'error'} label={row.rowType === 'income' ? dictionary.detail.revenue : dictionary.detail.expenses} />

  return (
    <ResponsiveDataTable
      mobileRows={rows}
      getMobileRowId={row => `${row.rowType}-${row.id}`}
      renderMobilePrimary={typeChip}
      mobileMetadata={[
        { id: 'note', label: dictionary.detail.note, render: row => row.note || '—' },
        { id: 'date', label: dictionary.detail.date, render: row => toDateInputValue(row.date) },
        { id: 'amount', label: dictionary.detail.amount, render: row => formatCurrency(row.amount, locale, row.currency) }
      ]}
    >
      <div className='no-scrollbar overflow-x-auto'>
        <table className='w-full'>
          <thead><tr className='border-be border-divider'><th className='p-3 text-start'>{dictionary.detail.type}</th><th className='p-3 text-start'>{dictionary.detail.note}</th><th className='p-3 text-start'>{dictionary.detail.date}</th><th className='p-3 text-end'>{dictionary.detail.amount}</th></tr></thead>
          <tbody>{rows.map(row => <tr key={`${row.rowType}-${row.id}`} className='border-be border-divider'><td className='p-3'>{typeChip(row)}</td><td className='p-3'><Typography variant='body2' className='max-is-[280px] truncate'>{row.note || '—'}</Typography></td><td className='p-3'>{toDateInputValue(row.date)}</td><td className={`p-3 text-end ${row.rowType === 'income' ? 'text-success' : 'text-error'}`}>{formatCurrency(row.amount, locale, row.currency)}</td></tr>)}</tbody>
        </table>
      </div>
    </ResponsiveDataTable>
  )
}

const ProjectDetailModal = ({ open, projectId, locale, baseCurrency, dictionary, options, canWrite, refreshKey, initialTab = 0, onClose, onEdit, onChanged }) => {
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState(null)
  const [staffId, setStaffId] = useState('')
  const [role, setRole] = useState('')
  const [contractId, setContractId] = useState('')
  const [working, setWorking] = useState(false)

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    const result = await getProjectDetail(projectId, { locale })

    if (result.success) { setProject(result.data); setContractId(result.data.contract_id || '') }
    else setError(result.error || dictionary.messages.detailLoadFailed)
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return
    setTab(initialTab)
    setError('')
    setStaffId('')
    setRole('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId, locale, refreshKey, initialTab])

  const eligibleStaff = useMemo(() => options.staff.filter(staff => !project?.members.some(member => member.staff.id === staff.id)), [options.staff, project?.members])
  const eligibleContracts = useMemo(() => options.contracts.filter(contract => contract.client_id === project?.client_id), [options.contracts, project?.client_id])

  const assign = async () => {
    if (!staffId) return
    setWorking(true)
    const result = await assignProjectMember(project.id, { staff_id: staffId, role, locale })

    if (result.success) { toast.success(result.message); setStaffId(''); setRole(''); await load(); await onChanged() } else toast.error(result.error)
    setWorking(false)
  }

  const remove = async memberId => {
    setWorking(true)
    const result = await removeProjectMember(project.id, memberId, { locale })

    if (result.success) { toast.success(result.message); await load(); await onChanged() } else toast.error(result.error)
    setWorking(false)
  }

  const updateContract = async value => {
    setWorking(true)
    const result = await updateProjectContract(project.id, value, { locale })

    if (result.success) { toast.success(result.message); setContractId(value); await load(); await onChanged() } else toast.error(result.error)
    setWorking(false)
  }

  const timesheetHours = project?.timesheets.reduce((sum, row) => sum + toFiniteNumber(row.hours_worked), 0) || 0
  const profit = (project?.financeSummary.revenue || 0) - (project?.financeSummary.expenses || 0)

  const financeCards = project ? [
    [dictionary.detail.revenue, project.financeSummary.revenue, 'text-success'],
    [dictionary.detail.expenses, project.financeSummary.expenses, 'text-error'],
    [dictionary.detail.profit, profit, profit >= 0 ? 'text-primary' : 'text-error']
  ] : []

  return (
    <Dialog open={open} onClose={loading || working ? undefined : onClose} fullWidth maxWidth='lg'>
      <DialogTitle className='flex items-start justify-between gap-4'><div className='min-is-0'><div className='flex flex-wrap items-center gap-2'><Typography variant='h5' className='truncate'>{project?.title || dictionary.actions.view}</Typography>{project && <Chip size='small' variant='tonal' label={project.status.label} {...statusChipProps(project.status)} />}</div><Typography color='text.secondary'>{project ? `${project.project_code} · ${project.client.company_name}` : dictionary.common.loading}</Typography></div><div className='flex items-center gap-1'>{canWrite && project && <Button size='small' variant='tonal' startIcon={<i className='tabler-edit' />} onClick={() => onEdit(project)}>{dictionary.actions.edit}</Button>}<IconButton onClick={onClose} disabled={loading || working}><i className='tabler-x' /></IconButton></div></DialogTitle>
      <DialogContent dividers className='min-bs-[620px]'>
        {loading ? <div className='flex min-bs-[520px] items-center justify-center'><CircularProgress /></div> : error ? <Alert severity='error'>{error}</Alert> : project ? <div className='flex flex-col gap-5'>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} variant='scrollable' scrollButtons='auto'><Tab icon={<i className='tabler-layout-dashboard' />} iconPosition='start' label={dictionary.detail.overview} /><Tab icon={<i className='tabler-users' />} iconPosition='start' label={`${dictionary.detail.team} (${project.members.length})`} /><Tab icon={<i className='tabler-file-certificate' />} iconPosition='start' label={dictionary.detail.contract} /><Tab icon={<i className='tabler-clock' />} iconPosition='start' label={dictionary.detail.timesheets} /><Tab icon={<i className='tabler-chart-pie' />} iconPosition='start' label={dictionary.detail.finances} /></Tabs>
          {tab === 0 && <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'><Card variant='outlined'><CardContent><Typography variant='h6' className='mb-4'>{dictionary.detail.scope}</Typography><Typography color='text.secondary' className='mb-5 whitespace-pre-wrap'>{project.description || '—'}</Typography><div className='grid grid-cols-2 gap-4'><Item label={dictionary.fields.area} value={project.project_area} /><Item label={dictionary.fields.sponsor} value={project.project_sponsor} /><Item label={dictionary.fields.manager} value={project.project_manager?.full_name} /><Item label={dictionary.fields.client} value={project.client.company_name} /></div></CardContent></Card><Card variant='outlined'><CardContent><Typography variant='h6' className='mb-4'>{dictionary.detail.timeline}</Typography><div className='grid grid-cols-2 gap-4'><Item label={dictionary.fields.startDate} value={toDateInputValue(project.start_date)} /><Item label={dictionary.fields.endDate} value={toDateInputValue(project.end_date)} /><Item label={dictionary.fields.actualEndDate} value={toDateInputValue(project.actual_end_date)} /><Item label={dictionary.fields.estimatedHours} value={`${project.actual_hours || 0} / ${project.estimated_hours || 0}h`} /></div><LinearProgress variant='determinate' value={project.progress} className='mt-5 bs-2 rounded' /></CardContent></Card><Card variant='outlined' className='lg:col-span-2'><CardContent><Typography variant='h6' className='mb-4'>{dictionary.detail.financial}</Typography><div className='grid grid-cols-2 gap-4 md:grid-cols-4'><Item label={dictionary.detail.transactionAmount} value={formatCurrency(project.budget, locale, project.currency)} accent='font-semibold text-primary' /><Item label={dictionary.detail.baseAmount} value={formatCurrency(project.amount_base, locale, baseCurrency)} accent='font-semibold text-success' /><Item label={dictionary.fields.currency} value={project.currency} /><Item label={dictionary.detail.rate} value={project.exchange_rate} /></div></CardContent></Card></div>}
          {tab === 1 && <div className='flex flex-col gap-4'>{canWrite && <Card variant='outlined'><CardContent className='grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_auto]'><CustomTextField select label={dictionary.fields.member} value={staffId} onChange={event => setStaffId(event.target.value)}><MenuItem value=''>{dictionary.placeholders.member}</MenuItem>{eligibleStaff.map(staff => <MenuItem key={staff.id} value={staff.id}>{staff.full_name} · {staff.position}</MenuItem>)}</CustomTextField><CustomTextField label={dictionary.fields.role} placeholder={dictionary.placeholders.role} value={role} onChange={event => setRole(event.target.value)} /><Button variant='contained' startIcon={<i className='tabler-user-plus' />} disabled={!staffId || working} onClick={assign}>{dictionary.actions.assign}</Button></CardContent></Card>}{project.members.length === 0 ? <EmptyPanel icon='tabler-users-minus' text={dictionary.detail.noMembers} /> : <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>{project.members.map(member => <Card key={member.id} variant='outlined'><CardContent className='flex items-center gap-3'><UserAvatar user={member.staff} size={40} /><div className='min-is-0 grow'><Typography className='truncate font-medium'>{member.staff.full_name}</Typography><Typography variant='body2' color='text.secondary' className='truncate'>{member.role || member.staff.position}</Typography><Typography variant='caption' color='text.secondary'>{dictionary.detail.assigned}: {toDateInputValue(member.assigned_at)}</Typography></div>{canWrite && <IconButton color='error' disabled={working} aria-label={dictionary.actions.remove} onClick={() => remove(member.id)}><i className='tabler-trash' /></IconButton>}</CardContent></Card>)}</div>}</div>}
          {tab === 2 && <div className='flex flex-col gap-4'>{canWrite && <Card variant='outlined'><CardContent className='flex flex-col items-end gap-3 sm:flex-row'><CustomTextField select className='is-full' label={dictionary.fields.contract} value={contractId} onChange={event => setContractId(event.target.value)}><MenuItem value=''>{dictionary.placeholders.contract}</MenuItem>{eligibleContracts.map(contract => <MenuItem key={contract.id} value={contract.id}>{contract.contract_number} · {contract.title}</MenuItem>)}</CustomTextField><Button className='whitespace-nowrap' variant='contained' disabled={working || contractId === (project.contract_id || '')} onClick={() => updateContract(contractId)}>{contractId ? dictionary.actions.link : dictionary.actions.unlink}</Button></CardContent></Card>}{!project.contract ? <EmptyPanel icon='tabler-file-off' text={dictionary.detail.noContract} /> : <Card variant='outlined'><CardContent><div className='mb-4 flex items-center gap-3'><span className='flex size-10 items-center justify-center rounded bg-primaryLighter text-primary'><i className='tabler-file-certificate' /></span><div><Typography variant='h6'>{project.contract.title}</Typography><Typography color='text.secondary'>{project.contract.contract_number}</Typography></div></div><div className='grid grid-cols-2 gap-4 md:grid-cols-4'><Item label={dictionary.fields.status} value={project.contract.status.label} /><Item label={dictionary.fields.budget} value={formatCurrency(project.contract.total_amount, locale, project.contract.currency)} /><Item label={dictionary.fields.startDate} value={toDateInputValue(project.contract.start_date)} /><Item label={dictionary.fields.endDate} value={toDateInputValue(project.contract.end_date)} /></div></CardContent></Card>}</div>}
          {tab === 3 && <div className='flex flex-col gap-4'><Card variant='outlined'><CardContent><div className='flex flex-wrap items-center justify-between gap-3'><div><Typography variant='h6'>{dictionary.detail.timesheets}</Typography><Typography color='text.secondary'>{timesheetHours} / {project.estimated_hours || 0}h</Typography></div><Chip variant='tonal' color='primary' label={`${Math.min(100, Math.round(timesheetHours / Math.max(toFiniteNumber(project.estimated_hours), 1) * 100))}%`} /></div><LinearProgress variant='determinate' value={Math.min(100, timesheetHours / Math.max(toFiniteNumber(project.estimated_hours), 1) * 100)} className='mt-4 bs-2 rounded' /></CardContent></Card>{project.timesheets.length === 0 ? <EmptyPanel icon='tabler-clock-off' text={dictionary.detail.noTimesheets} /> : <ProjectTimesheetTable rows={project.timesheets} dictionary={dictionary} />}</div>}
          {tab === 4 && <div className='flex flex-col gap-4'><div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>{financeCards.map(([label, value, colorClass]) => <Card key={label} variant='outlined'><CardContent><Typography color='text.secondary'>{label}</Typography><Typography variant='h5' className={`mt-1 ${colorClass}`}>{formatCurrency(value, locale, baseCurrency)}</Typography></CardContent></Card>)}</div>{project.expenses.length + project.incomes.length === 0 ? <EmptyPanel icon='tabler-cash-off' text={dictionary.detail.noFinances} /> : <ProjectFinanceTable project={project} dictionary={dictionary} locale={locale} />}</div>}
        </div> : null}
      </DialogContent>
    </Dialog>
  )
}

export default ProjectDetailModal
