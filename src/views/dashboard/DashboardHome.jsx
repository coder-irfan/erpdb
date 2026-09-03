'use client'

import { useId, useMemo, useRef, useState } from 'react'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis
} from '@/libs/Recharts'
import { getDashboardData } from '@/actions/dashboard'
import UserAvatar from '@/components/common/UserAvatar'
import DualCurrencyAmount from '@/components/currency/DualCurrencyAmount'
import DashboardSkeleton from '@/views/dashboard/DashboardSkeleton'
import { formatAfghanDate, formatAfghanTime, getAppLocale } from '@/utils/afghanDate'
import { DASHBOARD_PERIOD_KEYS, DASHBOARD_PERIOD_OPTIONS, getDashboardPresetDates } from '@/utils/dashboardPeriod'
import { formatCurrency } from '@/utils/formatCurrency'

const COLORS = {
  primary: 'var(--mui-palette-primary-main)',
  success: 'var(--mui-palette-success-main)',
  warning: 'var(--mui-palette-warning-main)',
  error: 'var(--mui-palette-error-main)',
  info: 'var(--mui-palette-info-main)',
  secondary: 'var(--mui-palette-secondary-main)'
}

const TONE_CLASSES = {
  primary: 'bg-primaryLighter text-primary',
  success: 'bg-successLighter text-success',
  warning: 'bg-secondaryLighter text-warning',
  error: 'bg-errorLighter text-error',
  info: 'bg-infoLighter text-info',
  secondary: 'bg-secondaryLighter text-secondary'
}

const DASHBOARD_STATUS_LABELS = {
  en: { staff: 'Staff receivables', corporate: 'Corporate liabilities', low: 'Low stock', out: 'Out of stock' },
  fa: { staff: 'مطالبات کارمندان', corporate: 'بدهی‌های شرکتی', low: 'موجودی کم', out: 'ناموجود' },
  ps: { staff: 'د کارکوونکو ترلاسه کېدونکي پورونه', corporate: 'د شرکت پورونه', low: 'کمه زېرمه', out: 'له زېرمې وتلی' }
}

const resolveColor = color => {
  if (/^#[0-9a-f]{6}$/i.test(color || '')) return color

  return COLORS[color?.toLowerCase()] || COLORS.primary
}

const replace = (text, values = {}) =>
  Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value), text)

const useFormatters = locale =>
  useMemo(() => {
    const resolvedLocale = getAppLocale(locale)

    return {
      number: value => new Intl.NumberFormat(resolvedLocale, { maximumFractionDigits: 1 }).format(Number(value || 0)),
      compact: value =>
        new Intl.NumberFormat(resolvedLocale, { notation: 'compact', maximumFractionDigits: 1 }).format(
          Number(value || 0)
        ),
      date: value => formatAfghanDate(value, locale, { dateStyle: 'medium' }),
      time: value => formatAfghanTime(value, locale)
    }
  }, [locale])

const PanelHeader = ({ title, subtitle, action }) => (
  <div className='flex flex-wrap items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5'>
    <div className='min-is-0'>
      <Typography variant='subtitle1' className='font-semibold text-textPrimary'>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant='caption' color='text.secondary'>
          {subtitle}
        </Typography>
      )}
    </div>
    {action}
  </div>
)

const EmptyInline = ({ message }) => (
  <div className='mx-4 mb-4 flex h-12 items-center justify-center gap-2 rounded-lg bg-actionHover px-3 text-textSecondary'>
    <i className='tabler-circle-check text-success' aria-hidden='true' />
    <Typography variant='caption'>{message}</Typography>
  </div>
)

const MiniSparkline = ({ values, color, variant = 'area' }) => {
  const id = useId().replaceAll(':', '')
  const data = (values?.length ? values : [0, 0]).map((value, index) => ({ index, value: Number(value || 0) }))
  const stroke = resolveColor(color)

  return (
    <ResponsiveContainer width='100%' height='100%' initialDimension={{ width: 120, height: 56 }}>
      {variant === 'bar' ? (
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <Bar dataKey='value' fill={stroke} fillOpacity={0.7} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor={stroke} stopOpacity={0.3} />
              <stop offset='100%' stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type='monotone'
            dataKey='value'
            stroke={stroke}
            strokeWidth={2.25}
            fill={`url(#spark-${id})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  )
}

const KpiCard = ({ title, value, hint, trend, series, color = 'primary', icon, variant, inverseTrend = false }) => (
  <Card className='h-[154px] border border-divider/70 shadow-sm'>
    <CardContent className='flex h-full flex-col p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-is-0'>
          <Typography variant='caption' color='text.secondary' className='font-semibold uppercase tracking-wide'>
            {title}
          </Typography>
          <Typography variant='h5' className='mt-1 truncate font-bold tracking-tight'>
            {value}
          </Typography>
        </div>
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[color] || TONE_CLASSES.primary}`}
        >
          <i className={`${icon} text-xl`} aria-hidden='true' />
        </span>
      </div>
      <div className='mt-auto flex items-end justify-between gap-3'>
        {typeof trend === 'number' && (
          <span
            className={`mb-1 inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              (inverseTrend ? trend <= 0 : trend >= 0)
                ? 'bg-successLighter text-success'
                : 'bg-errorLighter text-error'
            }`}
          >
            {trend >= 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
        )}
        <div className='h-12 min-is-[92px] flex-1'>
          <MiniSparkline values={series} color={color} variant={variant} />
        </div>
      </div>
      <Typography variant='caption' color='text.secondary' className='mt-1 block w-full truncate'>
        {hint}
      </Typography>
    </CardContent>
  </Card>
)

const KpiStrip = ({ items }) => (
  <div className='no-scrollbar overflow-x-auto'>
    <div className='grid min-is-max grid-flow-col auto-cols-[285px] gap-4'>
      {items.map(({ key, ...item }) => (
        <div key={key} className='is-[285px] shrink-0'>
          <KpiCard key={key} {...item} />
        </div>
      ))}
    </div>
  </div>
)

const ChartLoading = () => (
  <div className='flex h-[320px] items-end gap-3 px-5 pb-5'>
    {[55, 70, 48, 84, 60, 92, 75, 88].map((height, index) => (
      <Skeleton key={index} variant='rounded' className='flex-1' height={`${height}%`} />
    ))}
  </div>
)

const tooltipStyle = {
  background: 'var(--mui-palette-background-paper)',
  border: '1px solid var(--mui-palette-divider)',
  borderRadius: 12,
  boxShadow: 'var(--mui-customShadows-md)'
}

const tooltipTextStyle = { color: 'var(--mui-palette-text-primary)' }
const legendStyle = { color: 'var(--mui-palette-text-secondary)' }

const CashFlowChart = ({ data, currency, locale, dictionary, loading }) => (
  <Card className='h-full border border-divider/70 shadow-sm'>
    <PanelHeader title={dictionary.cashFlow.title} subtitle={dictionary.cashFlow.subtitle} />
    {loading ? (
      <ChartLoading />
    ) : data?.some(row => row.income || row.expense) ? (
      <div className='h-[320px] px-1 pb-4 sm:px-4'>
        <ResponsiveContainer width='100%' height='100%' initialDimension={{ width: 760, height: 320 }}>
          <AreaChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id='cashIncome' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={COLORS.primary} stopOpacity={0.32} />
                <stop offset='100%' stopColor={COLORS.primary} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke='var(--mui-palette-divider)'
              strokeOpacity={0.55}
              strokeDasharray='3 3'
              vertical={false}
            />
            <XAxis
              dataKey='month'
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--mui-palette-text-secondary)', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={58}
              tick={{ fill: 'var(--mui-palette-text-secondary)', fontSize: 11 }}
              tickFormatter={value => new Intl.NumberFormat(locale, { notation: 'compact' }).format(value)}
            />
            <ChartTooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipTextStyle}
              itemStyle={tooltipTextStyle}
              formatter={(value, name) => [
                formatCurrency(value, locale, currency),
                name === 'income' ? dictionary.cashFlow.income : dictionary.cashFlow.expenses
              ]}
            />
            <Legend
              wrapperStyle={legendStyle}
              formatter={name => (name === 'income' ? dictionary.cashFlow.income : dictionary.cashFlow.expenses)}
            />
            <Area type='monotone' dataKey='income' stroke={COLORS.primary} strokeWidth={2.5} fill='url(#cashIncome)' />
            <Line
              type='monotone'
              dataKey='expense'
              stroke={COLORS.error}
              strokeWidth={2.2}
              strokeDasharray='7 5'
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <EmptyInline message={dictionary.common.noData} />
    )}
  </Card>
)

const DistributionChart = ({ finance, currency, locale, dictionary }) => {
  const [view, setView] = useState('income')
  const data = view === 'income' ? finance.incomeDistribution : finance.expenseDistribution
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0)

  return (
    <Card className='h-full border border-divider/70 shadow-sm'>
      <PanelHeader
        title={dictionary.distribution.title}
        subtitle={dictionary.distribution.subtitle}
        action={
          <div className='flex rounded-lg bg-actionHover p-1'>
            {['income', 'expense'].map(option => (
              <Button
                key={option}
                size='small'
                variant={view === option ? 'contained' : 'text'}
                color={view === option ? 'primary' : 'secondary'}
                className='min-is-0 px-2.5 text-xs'
                onClick={() => setView(option)}
              >
                {dictionary.distribution[option]}
              </Button>
            ))}
          </div>
        }
      />
      {total ? (
        <div className='grid min-h-[320px] grid-cols-1 items-center gap-2 px-3 pb-4 sm:grid-cols-[minmax(190px,0.9fr)_1.1fr]'>
          <div className='relative h-[230px]'>
            <div className='pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center pt-1'>
              <Typography variant='h6' className='font-bold'>
                {formatCurrency(total, locale, currency)}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {dictionary.distribution.total}
              </Typography>
            </div>
            <ResponsiveContainer width='100%' height='100%' initialDimension={{ width: 240, height: 230 }}>
              <PieChart>
                <Pie data={data} dataKey='value' innerRadius={68} outerRadius={92} paddingAngle={3} stroke='none'>
                  {data.map(item => (
                    <Cell key={item.id} fill={resolveColor(item.color)} />
                  ))}
                </Pie>
                <ChartTooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipTextStyle}
                  itemStyle={tooltipTextStyle}
                  formatter={value => formatCurrency(value, locale, currency)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className='flex flex-col gap-2.5'>
            {data.slice(0, 6).map(item => (
              <div key={item.id} className='flex items-center justify-between gap-3'>
                <div className='flex min-is-0 items-center gap-2'>
                  <span
                    className='size-2.5 shrink-0 rounded-full'
                    style={{ backgroundColor: resolveColor(item.color) }}
                  />
                  <Typography variant='body2' className='truncate'>
                    {item.label}
                  </Typography>
                </div>
                <Typography variant='caption' className='whitespace-nowrap font-semibold'>
                  {Math.round((item.value / total) * 100)}%
                </Typography>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyInline message={dictionary.common.noData} />
      )}
    </Card>
  )
}

const FunnelCard = ({ pipeline, currency, locale, dictionary }) => {
  const max = Math.max(...pipeline.funnel.map(item => item.count), 1)

  return (
    <Card className='h-full border border-divider/70 shadow-sm'>
      <PanelHeader title={dictionary.funnel.title} subtitle={dictionary.funnel.subtitle} />
      {pipeline.funnel.some(item => item.count) ? (
        <div className='flex flex-col gap-3 px-4 pb-5 sm:px-5'>
          {pipeline.funnel.map(item => (
            <div key={item.id} className='grid grid-cols-[minmax(90px,0.8fr)_2fr_auto] items-center gap-3'>
              <div className='min-is-0'>
                <Typography variant='body2' className='truncate font-medium'>
                  {item.label}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {formatCurrency(item.value, locale, currency)}
                </Typography>
              </div>
              <div className='h-2.5 overflow-hidden rounded-full bg-actionHover'>
                <div
                  className='h-full rounded-full transition-[width] duration-300'
                  style={{
                    width: `${Math.max(item.count ? 8 : 0, (item.count / max) * 100)}%`,
                    backgroundColor: resolveColor(item.color)
                  }}
                />
              </div>
              <span className='min-is-8 rounded-full bg-actionHover px-2 py-1 text-center text-xs font-bold'>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyInline message={dictionary.funnel.empty} />
      )}
    </Card>
  )
}

const ProjectTrackers = ({ projects, dictionary, formatters }) => (
  <Card className='h-full border border-divider/70 shadow-sm'>
    <PanelHeader title={dictionary.projects.title} subtitle={dictionary.projects.subtitle} />
    {projects.length ? (
      <div className='divide-y divide-divider px-4 pb-2 sm:px-5'>
        {projects.map(project => {
          const overdue = project.endDate && new Date(project.endDate) < new Date()

          return (
            <div key={project.id} className='py-3'>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-is-0'>
                  <Typography variant='body2' className='truncate font-semibold'>
                    {project.title}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' className='block truncate'>
                    {project.code} · {project.client}
                  </Typography>
                </div>
                <Chip
                  size='small'
                  variant='tonal'
                  color={overdue ? 'error' : 'secondary'}
                  label={replace(overdue ? dictionary.projects.overdue : dictionary.projects.due, {
                    date: formatters.date(project.endDate)
                  })}
                />
              </div>
              <div className='mt-2 flex items-center gap-3'>
                <LinearProgress
                  variant='determinate'
                  value={project.taskProgress}
                  className='h-1.5 flex-1 rounded-full'
                />
                <Typography variant='caption' className='min-is-9 text-end font-bold'>
                  {project.taskProgress}%
                </Typography>
              </div>
              <div className='mt-1.5 flex flex-wrap justify-between gap-2 text-[11px] text-textSecondary'>
                <span>
                  {replace(dictionary.projects.tasks, { completed: project.completedTasks, total: project.totalTasks })}
                </span>
                <span>
                  {replace(dictionary.projects.hours, {
                    actual: formatters.number(project.loggedHours),
                    estimated: formatters.number(project.estimatedHours)
                  })}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    ) : (
      <EmptyInline message={dictionary.projects.empty} />
    )}
  </Card>
)

const DenseRow = ({ icon, color = 'primary', title, subtitle, value, action }) => (
  <div className='flex min-is-0 items-center gap-3 py-2.5'>
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TONE_CLASSES[color] || TONE_CLASSES.primary}`}
    >
      <i className={`${icon} text-base`} aria-hidden='true' />
    </span>
    <div className='min-is-0 flex-1'>
      <Typography variant='body2' className='truncate font-medium'>
        {title}
      </Typography>
      <Typography variant='caption' color='text.secondary' className='block truncate'>
        {subtitle}
      </Typography>
    </div>
    {value && (
      <Typography variant='caption' className='whitespace-nowrap font-bold'>
        {value}
      </Typography>
    )}
    {action}
  </div>
)

const OutstandingCard = ({ items, dictionary, locale, currency, formatters }) => (
  <Card className='border border-divider/70 shadow-sm'>
    <PanelHeader
      title={dictionary.urgent.outstanding}
      subtitle={dictionary.urgent.outstandingHint}
      action={
        <Button component={Link} href={`/${locale}/finance/income`} size='small' variant='text'>
          {dictionary.common.viewAll}
        </Button>
      }
    />
    {items.length ? (
      <div className='divide-y divide-divider px-4 pb-2'>
        {items.map(item => (
          <DenseRow
            key={item.id}
            icon='tabler-receipt-2'
            color='warning'
            title={item.title}
            subtitle={`${item.reference} · ${replace(dictionary.urgent.due, { date: formatters.date(item.dueDate) })}`}
            value={<DualCurrencyAmount amount={item.amount} amountBase={item.amountBase} currency={item.currency} exchangeRate={item.exchangeRate} locale={locale} className='items-end' />}
            action={
              <Button
                component={Link}
                href={`/${locale}/finance/income`}
                size='small'
                variant='tonal'
                className='min-is-0 px-2'
              >
                <i className='tabler-arrow-up-right text-base' />
              </Button>
            }
          />
        ))}
      </div>
    ) : (
      <EmptyInline message={dictionary.urgent.noOutstanding} />
    )}
  </Card>
)

const ContractExpiryCard = ({ items, dictionary, locale, formatters }) => (
  <Card className='border border-divider/70 shadow-sm'>
    <PanelHeader title={dictionary.urgent.contracts} subtitle={dictionary.urgent.contractsHint} />
    {items.length ? (
      <div className='divide-y divide-divider px-4 pb-2'>
        {items.map(item => (
          <DenseRow
            key={item.id}
            icon='tabler-file-time'
            color='error'
            title={item.client.company_name}
            subtitle={`${item.contract_number} · ${item.title}`}
            value={formatters.date(item.endDate)}
          />
        ))}
      </div>
    ) : (
      <EmptyInline message={dictionary.urgent.noContracts} />
    )}
  </Card>
)

const LoanCard = ({ urgent, dictionary, locale, currency }) => (
  <Card className='border border-divider/70 shadow-sm'>
    <PanelHeader
      title={dictionary.urgent.loans}
      subtitle={`${DASHBOARD_STATUS_LABELS[locale]?.staff || DASHBOARD_STATUS_LABELS.en.staff}: ${formatCurrency(urgent.loanTotals.staffReceivables, locale, currency)} · ${DASHBOARD_STATUS_LABELS[locale]?.corporate || DASHBOARD_STATUS_LABELS.en.corporate}: ${formatCurrency(urgent.loanTotals.corporateLiabilities, locale, currency)}`}
    />
    {urgent.loans.length ? (
      <div className='divide-y divide-divider px-4 pb-2'>
        {urgent.loans.map(item => (
          <DenseRow
            key={item.id}
            icon='tabler-coins'
            color='info'
            title={item.borrower}
            subtitle={`${item.loan_number} · ${item.loanType === 'CORPORATE' ? (DASHBOARD_STATUS_LABELS[locale]?.corporate || DASHBOARD_STATUS_LABELS.en.corporate) : (DASHBOARD_STATUS_LABELS[locale]?.staff || DASHBOARD_STATUS_LABELS.en.staff)}`}
            value={<DualCurrencyAmount amount={item.remainingBalance} amountBase={item.amountBase} currency={item.currency} exchangeRate={item.exchangeRate} locale={locale} className='items-end' />}
          />
        ))}
      </div>
    ) : (
      <EmptyInline message={dictionary.urgent.noLoans} />
    )}
  </Card>
)

const InventoryCard = ({ items, dictionary, locale }) => (
  <Card className='border border-divider/70 shadow-sm'>
    <PanelHeader title={dictionary.urgent.inventory} subtitle={dictionary.urgent.inventoryHint} />
    {items.length ? (
      <div className='divide-y divide-divider px-4 pb-2'>
        {items.map(item => (
          <DenseRow
            key={item.id}
            icon='tabler-package-off'
            color={item.stockState === 'OUT_OF_STOCK' ? 'error' : 'warning'}
            title={item.name}
            subtitle={`${item.sku_code} · ${item.category.label} · ${item.stockState === 'OUT_OF_STOCK' ? (DASHBOARD_STATUS_LABELS[locale]?.out || DASHBOARD_STATUS_LABELS.en.out) : (DASHBOARD_STATUS_LABELS[locale]?.low || DASHBOARD_STATUS_LABELS.en.low)}`}
            value={`${item.quantity_in_stock} / ${item.reorder_level}`}
          />
        ))}
      </div>
    ) : (
      <EmptyInline message={dictionary.urgent.noInventory} />
    )}
  </Card>
)

const DashboardHome = ({ initialData, dictionary }) => {
  const [data, setData] = useState(initialData)
  const [isPending, setIsPending] = useState(false)
  const [periodKey, setPeriodKey] = useState(initialData.period?.key || DASHBOARD_PERIOD_KEYS.THIS_MONTH)

  const [customRange, setCustomRange] = useState({
    startDate: initialData.period?.startDate || '',
    endDate: initialData.period?.endDate || ''
  })

  const requestId = useRef(0)
  const formatters = useFormatters(data.locale)
  const currency = data.company.currency
  const finance = data.finance
  const pipeline = data.pipeline
  const operations = data.operations
  const workforce = data.workforce
  const personal = data.personal

  const refresh = async filter => {
    const activeRequestId = ++requestId.current

    setIsPending(true)

    try {
      const result = await getDashboardData({ locale: data.locale, ...filter })

      if (activeRequestId === requestId.current && result.success) {
        setData(result.data)

        if (result.data.period.key !== DASHBOARD_PERIOD_KEYS.CUSTOM) {
          setCustomRange({ startDate: result.data.period.startDate || '', endDate: result.data.period.endDate || '' })
        }
      }
    } finally {
      if (activeRequestId === requestId.current) setIsPending(false)
    }
  }

  const filterFor = key => {
    if (key === DASHBOARD_PERIOD_KEYS.CUSTOM) return { period: key, ...customRange }

    return { period: key, ...getDashboardPresetDates(key) }
  }

  const changePeriod = event => {
    const nextPeriod = event.target.value

    setPeriodKey(nextPeriod)

    if (nextPeriod !== DASHBOARD_PERIOD_KEYS.CUSTOM) refresh(filterFor(nextPeriod))
  }

  const changeCustomDate = field => event => {
    const nextRange = { ...customRange, [field]: event.target.value }

    setCustomRange(nextRange)

    if (nextRange.startDate && nextRange.endDate && nextRange.startDate <= nextRange.endDate) {
      refresh({ period: DASHBOARD_PERIOD_KEYS.CUSTOM, ...nextRange })
    }
  }

  if (isPending) {
    return (
      <DashboardSkeleton
        label={dictionary.common.refreshing || dictionary.common.refresh}
        showCustomRange={periodKey === DASHBOARD_PERIOD_KEYS.CUSTOM}
      />
    )
  }

  const executiveKpis = [
    finance && {
      key: 'net',
      title: dictionary.kpis.netProfit,
      value: formatCurrency(finance.kpis.netProfit, data.locale, currency),
      hint: dictionary.kpis.netProfitHint,
      trend: finance.kpis.netGrowth,
      series: finance.kpis.netSparkline,
      color: 'success',
      icon: 'tabler-chart-line'
    },
    finance && {
      key: 'revenue',
      title: dictionary.kpis.revenue,
      value: formatCurrency(finance.kpis.revenue, data.locale, currency),
      hint: replace(dictionary.kpis.revenueHint, {
        amount: formatCurrency(finance.kpis.pendingRevenue, data.locale, currency)
      }),
      trend: finance.kpis.revenueGrowth,
      series: finance.kpis.revenueSparkline,
      color: 'primary',
      icon: 'tabler-cash-banknote',
      variant: 'bar'
    },
    finance && {
      key: 'expenses',
      title: dictionary.kpis.expenses,
      value: formatCurrency(finance.kpis.expenses, data.locale, currency),
      hint: dictionary.kpis.expensesHint,
      trend: finance.kpis.expenseGrowth,
      series: finance.kpis.expenseSparkline,
      color: 'error',
      icon: 'tabler-receipt-2',
      variant: 'bar',
      inverseTrend: true
    },
    pipeline && {
      key: 'pipeline',
      title: dictionary.kpis.pipeline,
      value: formatCurrency(pipeline.value, data.locale, currency),
      hint: replace(dictionary.kpis.pipelineHint, { count: pipeline.dealCount }),
      trend: pipeline.growth,
      series: pipeline.sparkline,
      color: 'info',
      icon: 'tabler-chart-funnel'
    },
    operations && {
      key: 'operations',
      title: dictionary.kpis.operations,
      value: operations.ratio,
      hint: replace(dictionary.kpis.operationsHint, { checked: operations.checkedIn }),
      series: operations.sparkline,
      color: 'warning',
      icon: 'tabler-briefcase-2'
    },
    workforce &&
      !operations && {
        key: 'workforce',
        title: dictionary.kpis.workforce,
        value: `${workforce.checkedIn} / ${workforce.active}`,
        hint: replace(dictionary.kpis.workforceHint, { rate: workforce.attendanceRate }),
        series: workforce.sparkline,
        color: 'success',
        icon: 'tabler-users-group'
      }
  ].filter(Boolean)

  const personalKpis = personal
    ? [
        {
          key: 'tasks',
          title: dictionary.personal.openTasks,
          value: personal.openTasks,
          hint: dictionary.personal.assigned,
          series: [0, personal.openTasks],
          color: 'primary',
          icon: 'tabler-list-check'
        },
        {
          key: 'overdue',
          title: dictionary.personal.overdue,
          value: personal.overdueTasks,
          hint: dictionary.personal.needsAttention,
          series: [0, personal.overdueTasks],
          color: 'error',
          icon: 'tabler-alert-triangle'
        },
        {
          key: 'hours',
          title: dictionary.personal.hours,
          value: `${formatters.number(personal.periodHours)}h`,
          hint: dictionary.personal.selectedPeriod,
          series: [0, personal.periodHours],
          color: 'info',
          icon: 'tabler-clock-hour-4'
        },
        {
          key: 'loan',
          title: dictionary.personal.loan,
          value: formatCurrency(personal.loans.balance, data.locale, currency),
          hint: replace(dictionary.personal.loanHint, { count: personal.loans.count }),
          series: [0, personal.loans.balance],
          color: 'warning',
          icon: 'tabler-coins'
        }
      ]
    : []

  const kpis = personalKpis.length ? personalKpis : executiveKpis

  const urgentVisible =
    data.urgent.outstanding.length ||
    data.urgent.contracts.length ||
    data.urgent.loans.length ||
    data.urgent.inventory.length ||
    data.capabilities.finance ||
    data.capabilities.contracts ||
    data.capabilities.loans ||
    data.capabilities.inventory

  return (
    <div className='flex flex-col gap-5'>
      <header className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex min-is-0 items-center gap-3'>
          <UserAvatar user={data.user} size={44} />
          <div className='min-is-0'>
            <Typography variant='h5' className='truncate font-bold'>
              {dictionary.title}
            </Typography>
            <Typography variant='body2' color='text.secondary' className='truncate'>
              {replace(dictionary.subtitle, { name: data.user.name })}
            </Typography>
          </div>
        </div>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <Select
            size='small'
            value={periodKey}
            onChange={changePeriod}
            disabled={isPending}
            className='h-8 min-is-[148px] text-xs'
            aria-label={dictionary.period.label}
          >
            {DASHBOARD_PERIOD_OPTIONS.map(option => (
              <MenuItem key={option} value={option}>
                {dictionary.period[option]}
              </MenuItem>
            ))}
          </Select>
          {periodKey === DASHBOARD_PERIOD_KEYS.CUSTOM && (
            <>
              <CustomTextField
                type='date'
                size='small'
                value={customRange.startDate}
                onChange={changeCustomDate('startDate')}
                aria-label={dictionary.period.startDate}
                className='is-[142px] [&_.MuiInputBase-root]:h-8 [&_input]:text-xs'
              />
              <CustomTextField
                type='date'
                size='small'
                value={customRange.endDate}
                onChange={changeCustomDate('endDate')}
                inputProps={{ min: customRange.startDate || undefined }}
                aria-label={dictionary.period.endDate}
                className='is-[142px] [&_.MuiInputBase-root]:h-8 [&_input]:text-xs'
              />
            </>
          )}
          <Button
            variant='tonal'
            size='small'
            disabled={isPending}
            className='h-8 whitespace-nowrap'
            startIcon={<i className={`tabler-refresh ${isPending ? 'animate-spin' : ''}`} />}
            onClick={() => refresh(filterFor(periodKey))}
          >
            {dictionary.common.refresh}
          </Button>
        </div>
      </header>

      {kpis.length ? <KpiStrip items={kpis} /> : null}

      {finance && (
        <section className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
          <CashFlowChart
            data={finance.cashFlow}
            currency={currency}
            locale={data.locale}
            dictionary={dictionary}
            loading={isPending}
          />
          <DistributionChart finance={finance} currency={currency} locale={data.locale} dictionary={dictionary} />
        </section>
      )}

      {(pipeline?.funnel?.length || operations) && (
        <section className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
          {pipeline?.funnel?.length ? (
            <FunnelCard pipeline={pipeline} currency={currency} locale={data.locale} dictionary={dictionary} />
          ) : null}
          {operations ? (
            <ProjectTrackers projects={operations.projects} dictionary={dictionary} formatters={formatters} />
          ) : null}
        </section>
      )}

      {urgentVisible ? (
        <section>
          <div className='mb-3'>
            <Typography variant='h6' className='font-semibold'>
              {dictionary.urgent.title}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {dictionary.urgent.subtitle}
            </Typography>
          </div>
          <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
            {(data.capabilities.finance || data.capabilities.contracts) && (
              <OutstandingCard
                items={data.urgent.outstanding}
                dictionary={dictionary}
                locale={data.locale}
                currency={currency}
                formatters={formatters}
              />
            )}
            {data.capabilities.contracts && (
              <ContractExpiryCard
                items={data.urgent.contracts}
                dictionary={dictionary}
                locale={data.locale}
                formatters={formatters}
              />
            )}
            {data.capabilities.loans && (
              <LoanCard urgent={data.urgent} dictionary={dictionary} locale={data.locale} currency={currency} />
            )}
            {data.capabilities.inventory && <InventoryCard items={data.urgent.inventory} dictionary={dictionary} locale={data.locale} />}
          </div>
        </section>
      ) : null}

      {data.capabilities.staffOnly && !data.user.staffId && <EmptyInline message={dictionary.personal.noStaff} />}
    </div>
  )
}

export default DashboardHome
