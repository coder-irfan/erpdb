'use client'

import dynamic from 'next/dynamic'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

const ReportTrendChart = ({ title, trend, series, categories, loading, valueFormatter, emptyLabel, className = '' }) => {
  const theme = useTheme()
  const textSecondary = theme.palette.text.secondary
  const divider = theme.palette.divider
  const safeCategories = Array.isArray(categories) ? categories : []

  const safeSeries = Array.isArray(series)
    ? series.map(item => ({
        name: item?.name || '',
        data: Array.isArray(item?.data) ? item.data.map(value => (Number.isFinite(Number(value)) ? Number(value) : 0)) : []
      }))
    : [{ name: '', data: [] }]

  const hasChartData = safeCategories.length > 0 && safeSeries.some(item => item.data.length > 0)

  const options = {
    chart: {
      parentHeightOffset: 0,
      foreColor: textSecondary,
      toolbar: { show: false },
      animations: { enabled: true }
    },
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-secondary-main)', 'var(--mui-palette-success-main)'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', borderRadiusApplication: 'end' } },
    grid: { borderColor: divider, strokeDashArray: 5, padding: { left: 4, right: 8 } },
    legend: {
      position: 'top',
      horizontalAlign: theme.direction === 'rtl' ? 'right' : 'left',
      labels: { colors: textSecondary }
    },
    xaxis: {
      categories: safeCategories,
      reversed: theme.direction === 'rtl',
      axisBorder: { color: divider },
      axisTicks: { show: false },
      labels: { style: { colors: textSecondary, fontFamily: theme.typography.fontFamily } }
    },
    yaxis: {
      opposite: theme.direction === 'rtl',
      labels: {
        formatter: value => (valueFormatter ? valueFormatter(value) : Number(value).toLocaleString()),
        style: { colors: textSecondary, fontFamily: theme.typography.fontFamily }
      }
    },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      y: { formatter: value => (valueFormatter ? valueFormatter(value) : Number(value).toLocaleString()) }
    }
  }

  return (
    <Card className={`report-chart-card ${className}`}>
      <CardContent>
        <Typography variant='h6' className='mb-4'>
          {title}
        </Typography>
        {loading ? (
          <Skeleton variant='rounded' height={310} />
        ) : !hasChartData ? (
          <div className='flex min-bs-[310px] flex-col items-center justify-center gap-3 text-center'>
            <span className='flex size-14 items-center justify-center rounded-full bg-primaryLighter text-primary'>
              <i className='tabler-chart-line-off text-3xl' />
            </span>
            <Typography color='text.secondary'>{emptyLabel}</Typography>
          </div>
        ) : (
          <AppReactApexCharts
            type={trend === 'bar' ? 'bar' : 'line'}
            height={310}
            width='100%'
            options={options}
            series={safeSeries}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default ReportTrendChart
