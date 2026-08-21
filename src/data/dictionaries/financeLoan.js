import en from '@/data/dictionaries/en.json'
import fa from '@/data/dictionaries/fa.json'
import ps from '@/data/dictionaries/ps.json'

const translations = {
  en: en.financeLoans,
  fa: fa.financeLoans,
  ps: ps.financeLoans
}

export const getFinanceLoanDictionary = locale => translations[locale] || translations.en

