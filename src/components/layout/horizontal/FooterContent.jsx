'use client'

// Next Imports
import Link from 'next/link'

// Third-party Imports
import classnames from 'classnames'

// Util Imports
import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  return (
    <div
      className={classnames(horizontalLayoutClasses.footerContent, 'flex items-center justify-center flex-wrap gap-4')}
    >
      <p>
        <span className='text-textSecondary'>{`© ${new Date().getFullYear()}`}</span>
        <span className='text-textSecondary'>{` Developed by `}</span>
        <Link href='https://asantech.net/' target='_blank' className='text-primary uppercase'>
          Asan Tech
        </Link>
      </p>
    </div>
  )
}

export default FooterContent
