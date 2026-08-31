'use client'

import { useEffect, useState } from 'react'

import { getFinanceSalaryDetail } from '@/actions/financeSalary'

const useFinanceSalaryDetail = ({ open, salaryId, locale, refreshKey, fallbackError }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !salaryId) {
      setData(null)
      setError('')

      return
    }

    let active = true

    setData(null)
    setLoading(true)
    setError('')

    getFinanceSalaryDetail(salaryId, { locale })
      .then(result => {
        if (!active) return

        if (result.success) setData(result.data)
        else setError(result.error || fallbackError)
      })
      .catch(() => {
        if (active) setError(fallbackError)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fallbackError, locale, open, refreshKey, salaryId])

  return { data, loading, error }
}

export default useFinanceSalaryDetail
