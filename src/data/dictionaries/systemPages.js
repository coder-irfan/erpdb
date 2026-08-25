import en from '@/data/dictionaries/en.json'
import fa from '@/data/dictionaries/fa.json'
import ps from '@/data/dictionaries/ps.json'

const translations = { en, fa, ps }

export const getSystemPagesDictionary = locale => (translations[locale] || translations.en).systemPages
