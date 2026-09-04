'use client'

import dynamic from 'next/dynamic'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import { formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

const COLORS = [
  'var(--mui-palette-primary-main)',
  'var(--mui-palette-success-main)',
  'var(--mui-palette-warning-main)',
  'var(--mui-palette-info-main)',
  'var(--mui-palette-error-main)',
  'var(--mui-palette-secondary-main)'
]

const safeArray = value => Array.isArray(value) ? value.filter(item => item != null) : []

const FinanceChartCard = ({ chart, title, dictionary, locale, currency, loading }) => {
  const theme = useTheme()
  const textPrimary = theme.palette.text.primary
  const textSecondary = theme.palette.text.secondary
  const divider = theme.palette.divider
  const tooltipTheme = theme.palette.mode === 'dark' ? 'dark' : 'light'
  const isDistribution = chart?.type === 'donut'
  const labels = safeArray(chart?.labels).map(label => dictionary.labels?.[label] || label || dictionary.empty)

  const formatter = value =>
    chart?.value_kind === 'quantity' ? toFiniteNumber(value).toLocaleString() : formatCurrency(value, locale, currency)

  const series = isDistribution
    ? safeArray(chart?.series).map(toFiniteNumber)
    : Array.isArray(chart?.series)
      ? safeArray(chart.series).filter(item => typeof item === 'object').map(item => ({
          name: dictionary.series?.[item.key] || item.key,
          data: safeArray(item.data).map(toFiniteNumber)
        }))
      : [
          {
            name: dictionary.series?.[chart?.series_key] || chart?.series_key || '',
            data: safeArray(chart?.values).map(toFiniteNumber)
          }
        ]

  const hasData = isDistribution
    ? series.some(value => value > 0)
    : series.some(item => item.data.some(value => value !== 0))

  const options = isDistribution
    ? {
        chart: {
          parentHeightOffset: 0,
          foreColor: textSecondary,
          toolbar: { show: false },
          animations: { enabled: true }
        },
        labels,
        colors: COLORS,
        stroke: { width: 0 },
        dataLabels: {
          enabled: true,
          formatter: value => `${Math.round(value)}%`,
          style: { colors: [textPrimary], fontFamily: theme.typography.fontFamily }
        },
        legend: {
          position: 'bottom',
          fontFamily: theme.typography.fontFamily,
          labels: { colors: textSecondary }
        },
        plotOptions: {
          pie: {
            donut: {
              size: '66%',
              labels: {
                show: true,
                name: { color: textSecondary },
                value: { color: textPrimary },
                total: { show: true, label: dictionary.total, color: textSecondary }
              }
            }
          }
        },
        tooltip: { theme: tooltipTheme, y: { formatter } },
        responsive: [{ breakpoint: 600, options: { chart: { height: 300 }, legend: { position: 'bottom' } } }]
      }
    : {
        chart: {
          parentHeightOffset: 0,
          foreColor: textSecondary,
          stacked: Boolean(chart?.stacked),
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: false,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: false,
              reset: true
            }
          },
          animations: { enabled: true }
        },
        colors: COLORS,
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: chart?.stacked ? 0 : 3 },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '48%', borderRadiusApplication: 'end' } },
        grid: { borderColor: divider, strokeDashArray: 5 },
        legend: {
          position: 'top',
          horizontalAlign: theme.direction === 'rtl' ? 'right' : 'left',
          labels: { colors: textSecondary }
        },
        xaxis: {
          categories: safeArray(chart?.categories),
          reversed: theme.direction === 'rtl',
          axisBorder: { color: divider },
          axisTicks: { show: false },
          labels: {
            trim: true,
            rotate: -35,
            style: { colors: textSecondary, fontFamily: theme.typography.fontFamily }
          }
        },
        yaxis: {
          opposite: theme.direction === 'rtl',
          labels: {
            formatter,
            style: { colors: textSecondary, fontFamily: theme.typography.fontFamily }
          }
        },
        tooltip: { theme: tooltipTheme, y: { formatter } }
      }

  return (
    <Card className='report-chart-card min-is-0'>
      <CardContent>
        <Typography variant='h6' className='mb-4'>
          {title}
        </Typography>
        {loading ? (
          <Skeleton variant='rounded' height={320} />
        ) : !hasData ? (
          <div className='flex min-bs-[320px] flex-col items-center justify-center gap-3 text-center'>
            <span className='flex size-14 items-center justify-center rounded-full bg-primaryLighter text-primary'>
              <i className='tabler-chart-line-off text-3xl' />
            </span>
            <Typography color='text.secondary'>{dictionary.empty}</Typography>
          </div>
        ) : (
          <AppReactApexCharts
            type={isDistribution ? 'donut' : chart.type || 'bar'}
            height={320}
            width='100%'
            options={options}
            series={series}
          />
        )}
      </CardContent>
    </Card>
  )
}

const FinanceReportCharts = ({ tab, charts, loading, dictionary, locale, currency }) => {
  const expectedCharts = tab === 'salary' ? ['trend'] : tab === 'loans' ? ['distribution'] : ['trend', 'distribution']
  const items = expectedCharts.map(key => ({ key, chart: charts?.[key], title: dictionary.titles?.[tab]?.[key] || key }))

  return (
    <div className={`grid grid-cols-1 gap-4 ${items.length > 1 ? 'xl:grid-cols-2' : ''}`}>
      {items.map(item => (
        <FinanceChartCard
          key={`${tab}-${item.key}`}
          chart={item.chart}
          title={item.title}
          dictionary={dictionary}
          locale={locale}
          currency={currency}
          loading={loading}
        />
      ))}
    </div>
  )
}

export default FinanceReportCharts
