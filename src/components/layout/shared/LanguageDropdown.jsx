'use client'

// React Imports
import { useRef, useState } from 'react'

// Next Imports
import { usePathname, useParams, useRouter } from 'next/navigation'

// MUI Imports
import Button from '@mui/material/Button'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import MenuItem from '@mui/material/MenuItem'

// Third-party Imports
import ReactCountryFlag from 'react-country-flag'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Config Imports
import { i18n } from '@/configs/i18n'

const getLocalePath = (pathName, locale) => {
  const segments = (pathName || '/').split('/').filter(Boolean)

  while (i18n.locales.includes(segments[0])) {
    segments.shift()
  }

  return `/${[locale, ...segments].join('/')}`
}

// Vars
const languageData = [
  {
    langCode: 'en',
    langName: 'English',
    countryCode: 'US'
  },
  {
    langCode: 'fa',
    langName: 'دری',
    countryCode: 'AF'
  },
  {
    langCode: 'ps',
    langName: 'پشتو',
    countryCode: 'AF'
  }
]

const LanguageDropdown = () => {
  // States
  const [open, setOpen] = useState(false)

  // Refs
  const anchorRef = useRef(null)

  // Hooks
  const pathName = usePathname()
  const router = useRouter()
  const { settings } = useSettings()
  const { lang } = useParams()
  const selectedLanguage = languageData.find(language => language.langCode === lang) || languageData[0]

  const handleClose = () => {
    setOpen(false)
  }

  const handleToggle = () => {
    setOpen(prevOpen => !prevOpen)
  }

  const handleLanguageChange = locale => {
    router.push(getLocalePath(pathName, locale))
    handleClose()
  }

  return (
    <>
      <Button
        ref={anchorRef}
        onClick={handleToggle}
        color='inherit'
        className='text-textPrimary min-is-0 gap-0 normal-case lg:gap-2'
      >
        <ReactCountryFlag
          svg
          countryCode={selectedLanguage.countryCode}
          aria-label={`${selectedLanguage.countryCode} flag`}
          className='text-xl'
        />
        <span className='hidden lg:inline-flex'>{selectedLanguage.langName}</span>
      </Button>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-start'
        anchorEl={anchorRef.current}
        className='min-is-[160px] !mbs-3 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{ transformOrigin: placement === 'bottom-start' ? 'left top' : 'right top' }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList onKeyDown={handleClose}>
                  {languageData.map(locale => (
                    <MenuItem
                      key={locale.langCode}
                      onClick={() => handleLanguageChange(locale.langCode)}
                      selected={lang === locale.langCode}
                      className='gap-2'
                    >
                      <ReactCountryFlag
                        svg
                        countryCode={locale.countryCode}
                        aria-label={`${locale.countryCode} flag`}
                        className='text-xl'
                      />
                      <span>{locale.langName}</span>
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default LanguageDropdown
