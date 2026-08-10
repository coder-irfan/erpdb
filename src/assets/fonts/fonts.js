// Next Imports
import { Public_Sans, Vazirmatn } from 'next/font/google'
import localFont from 'next/font/local'

export const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-public-sans',
  display: 'swap'
})

export const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  display: 'swap'
})

export const peyda = localFont({
  src: [
    {
      path: './Peyda-Regular.woff2',
      weight: '400',
      style: 'normal'
    },
    {
      path: './Peyda-Medium.woff2',
      weight: '500',
      style: 'normal'
    },
    {
      path: './Peyda-SemiBold.woff2',
      weight: '600',
      style: 'normal'
    },
    {
      path: './Peyda-Bold.woff2',
      weight: '700',
      style: 'normal'
    },
    {
      path: './Peyda-Black.woff2',
      weight: '900',
      style: 'normal'
    }
  ],
  variable: '--font-peyda',
  display: 'swap'
})
