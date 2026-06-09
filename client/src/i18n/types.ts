export type Locale = 'vi' | 'en'

export const LOCALES: Locale[] = ['vi', 'en']

export const DEFAULT_LOCALE: Locale = 'vi'

export const LOCALE_STORAGE_KEY = 'galaxies_locale'

export type MessageTree = {
  [key: string]: string | MessageTree
}
