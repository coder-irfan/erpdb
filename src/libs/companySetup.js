import 'server-only'

import { prisma } from '@/libs/prisma'

export const DEFAULT_COMPANY_SETUP = {
  id: null,
  app_name: 'ERP System',
  company_name: 'Company',
  company_logo: null,
  company_email: null,
  company_phone: null,
  company_address: null,
  company_tax_id: null,
  signatory_name: null,
  signatory_title: null,
  signatory_stamp: null,
  currency_code: 'AFN',
  usd_afn_exchange_rate: '65.0000',
  currency_symbol: '؋',
  timezone: 'Asia/Kabul',
  date_format: 'YYYY-MM-DD',
  fiscal_year_start: '01-01',
  default_work_start: '08:30',
  default_work_end: '17:30',
  default_tax_rate: '0.00'
}

export const normalizeCompanySetup = setup =>
  setup
    ? {
        ...setup,
        default_tax_rate: setup.default_tax_rate.toFixed(2),
        usd_afn_exchange_rate: setup.usd_afn_exchange_rate.toFixed(4),
        created_at: setup.created_at.toISOString(),
        updated_at: setup.updated_at.toISOString()
      }
    : DEFAULT_COMPANY_SETUP

export const getCompanySetupRecord = async () => {
  const setup = await prisma.setup.findUnique({ where: { scope: 'GLOBAL' } })

  return normalizeCompanySetup(setup)
}
