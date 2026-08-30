'use client'

import { useState } from 'react'

import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'

const FILTER_LABELS = {
  en: 'Filters',
  fa: 'فیلترها',
  ps: 'فلټرونه'
}

const RESET_LABELS = { en: 'Clear Filters', fa: 'پاک‌کردن فیلترها', ps: 'فلټرونه پاک کړئ' }

const TableFiltersPopover = ({ activeCount = 0, children, locale = 'en', onReset }) => {
  const [anchorElement, setAnchorElement] = useState(null)
  const open = Boolean(anchorElement)
  const label = FILTER_LABELS[locale] || FILTER_LABELS.en

  return (
    <>
      <Button
        variant={activeCount > 0 ? 'tonal' : 'outlined'}
        startIcon={<i className='tabler-filter' />}
        aria-haspopup='dialog'
        aria-expanded={open}
        onClick={event => setAnchorElement(event.currentTarget)}
      >
        {label} ({activeCount})
      </Button>
      <Popover
        open={open}
        anchorEl={anchorElement}
        onClose={() => setAnchorElement(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { className: 'mt-2 w-[min(360px,calc(100vw-2rem))] overflow-visible p-4' } }}
      >
        <div className='flex flex-col md:gap-4 gap-2'>
          {children}
          {activeCount > 0 && onReset && (
            <Button variant='tonal' color='secondary' startIcon={<i className='tabler-filter-off' />} onClick={onReset}>
              {RESET_LABELS[locale] || RESET_LABELS.en}
            </Button>
          )}
        </div>
      </Popover>
    </>
  )
}

export default TableFiltersPopover
