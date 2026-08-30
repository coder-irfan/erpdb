import { notFound } from 'next/navigation'

import { authorizeAction } from '@/libs/actionAuthorization'
import { getCompanySetupRecord } from '@/libs/companySetup'
import { LOAN_READ_PERMISSIONS, loanSelect, normalizeLoan } from '@/libs/financeLoans'
import { prisma } from '@/libs/prisma'
import FinanceLoanPrint from '@/views/finance/loans/FinanceLoanPrint'

const FinanceLoanPrintPage = async props => {
  const { id, lang } = await props.params
  const authorization = await authorizeAction(LOAN_READ_PERMISSIONS)

  if (!authorization.authorized) notFound()

  const [loan, setup] = await Promise.all([
    prisma.financeloan.findUnique({ where: { id }, select: loanSelect }),
    getCompanySetupRecord()
  ])

  if (!loan) notFound()

  return <FinanceLoanPrint loan={normalizeLoan(loan)} setup={setup} locale={lang} />
}

export default FinanceLoanPrintPage
