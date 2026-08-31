import en from './en.json'
import fa from './fa.json'
import ps from './ps.json'

const translations = { en, fa, ps }

export const getSharedDictionary = locale => (translations[locale] || translations.en).shared
