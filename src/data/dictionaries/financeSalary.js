import en from '@/data/dictionaries/en.json'
import fa from '@/data/dictionaries/fa.json'
import ps from '@/data/dictionaries/ps.json'

const translations = {
  en: en.financeSalary,
  fa: fa.financeSalary,
  ps: ps.financeSalary
}

export const getFinanceSalaryDictionary = locale => translations[locale] || translations.en

