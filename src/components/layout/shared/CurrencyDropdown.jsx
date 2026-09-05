'use client'

import { useCallback, useRef, useState } from 'react'

import Button from '@mui/material/Button'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Fade from '@mui/material/Fade'
import MenuItem from '@mui/material/MenuItem'
import MenuList from '@mui/material/MenuList'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Tooltip from '@mui/material/Tooltip'

import { useSettings } from '@core/hooks/useSettings'
import { useCurrency } from '@/contexts/CurrencyContext'

const CURRENCIES = {
  USD: { symbol: '$', label: 'USD' },
  AFN: { symbol: '\u060B', label: 'AFN' }
}

const CurrencyDropdown = () => {
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const anchorRef = useRef(null)
  const { settings } = useSettings()
  const { currentCurrency, exchangeRate, setCurrency } = useCurrency()
  const selected = CURRENCIES[currentCurrency]

  const handleClose = useCallback(() => {
    setOpen(false)
    setTooltipOpen(false)
  }, [])

  const handleToggle = useCallback(() => setOpen(current => !current), [])

  const handleCurrencyChange = useCallback(
    nextCurrency => {
      if (nextCurrency !== currentCurrency) setCurrency(nextCurrency)

      handleClose()
    },
    [currentCurrency, handleClose, setCurrency]
  )

  const handleMenuKeyDown = useCallback(
    event => {
      if (event.key === 'Escape') handleClose()
    },
    [handleClose]
  )

  return (
    <>
      <Tooltip
        title={`Display currency: ${selected.label}`}
        onOpen={() => setTooltipOpen(true)}
        onClose={() => setTooltipOpen(false)}
        open={open ? false : tooltipOpen}
      >
        <Button
          ref={anchorRef}
          aria-haspopup='menu'
          aria-expanded={open}
          onClick={handleToggle}
          className='min-is-0 whitespace-nowrap px-2 text-textPrimary sm:px-2.5'
          startIcon={<i className='tabler-currency-exchange text-base' />}
        >
          <span className='font-semibold'>{selected.symbol}</span>
          <span className='ms-1 text-xs'>{selected.label}</span>
        </Button>
      </Tooltip>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[188px] !mbs-3 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'left top' : 'right top' }}>
            <Paper className={`topbar-dropdown ${settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}`}>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList onKeyDown={handleMenuKeyDown} aria-label='Display currency'>
                  {Object.entries(CURRENCIES).map(([code, option]) => (
                    <MenuItem
                      key={code}
                      selected={currentCurrency === code}
                      className='gap-3'
                      onClick={() => handleCurrencyChange(code)}
                    >
                      <span className='inline-flex size-6 items-center justify-center rounded bg-actionHover font-semibold'>
                        {option.symbol}
                      </span>
                      <span>{option.label}</span>
                      {code === 'USD' && (
                        <span className='ms-auto text-xs text-textSecondary'>1 = {exchangeRate} AFN</span>
                      )}
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

export default CurrencyDropdown
