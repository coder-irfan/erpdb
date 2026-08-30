'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { getFinanceSalaryDetail } from '@/actions/financeSalary'
import DetailSkeleton from '@/components/dialogs/DetailSkeleton'

import SalaryPayslipPrintDocument from './SalaryPayslipPrintDocument'

const FinanceSalaryPayslipModal = ({ open, salaryId, locale, dictionary, refreshKey, onClose }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !salaryId) return
    let active = true

    setLoading(true)
    setError('')
    getFinanceSalaryDetail(salaryId, { locale }).then(result => {
      if (!active) return
      if (result.success) setData(result.data)
      else setError(result.error || dictionary.messages.detailLoadFailed)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [dictionary.messages.detailLoadFailed, locale, open, refreshKey, salaryId])

  const salary = data?.salary
  const company = data?.company

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle className='finance-payslip-toolbar flex items-center justify-between gap-4'>
        <div>
          <Typography variant='h5'>{dictionary.payslip.title}</Typography>
          <Typography color='text.secondary'>{salary?.staff?.full_name || dictionary.common.notAvailable}</Typography>
        </div>
        <div className='flex items-center gap-2'>
          {salary && (
            <Button variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>
              {dictionary.actions.print}
            </Button>
          )}
          <IconButton onClick={onClose} aria-label={dictionary.actions.close}>
            <i className='tabler-x' />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers className='min-bs-[560px]'>
        {loading ? (
          <DetailSkeleton rows={6} />
        ) : error ? (
          <Alert severity='error'>{error}</Alert>
        ) : salary ? (
          <div className='finance-payslip-print mx-auto w-full bg-background p-2 sm:p-6'>
            <SalaryPayslipPrintDocument salary={salary} company={company} locale={locale} dictionary={dictionary} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default FinanceSalaryPayslipModal
