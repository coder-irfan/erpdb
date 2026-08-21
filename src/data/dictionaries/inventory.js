import en from '@/data/dictionaries/en.json'
import fa from '@/data/dictionaries/fa.json'
import ps from '@/data/dictionaries/ps.json'

const translations = {
  en: en.inventoryManagement,
  fa: fa.inventoryManagement,
  ps: ps.inventoryManagement
}

export const getInventoryDictionary = locale => translations[locale] || translations.en

