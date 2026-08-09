// Third-party Imports
import 'server-only'

const dictionaries = {
  en: () => import('@/data/dictionaries/en.json').then(module => module.default),
  ps: () => import('@/data/dictionaries/ps.json').then(module => module.default),
  fa: () => import('@/data/dictionaries/fa.json').then(module => module.default)
}

export const getDictionary = async locale => dictionaries[locale]()
