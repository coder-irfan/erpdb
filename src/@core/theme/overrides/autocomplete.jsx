// React Imports
import React from 'react'

const autocomplete = skin => ({
  MuiAutocomplete: {
    defaultProps: {
      ...(skin === 'bordered' && {
        slotProps: {
          paper: {
            variant: 'outlined'
          }
        }
      }),
      ChipProps: {
        size: 'small'
      },
      popupIcon: <i className='tabler-chevron-down' />
    },
    styleOverrides: {
      root: {
        '& .MuiButtonBase-root.Mui-disabled i, & .MuiButtonBase-root.Mui-disabled svg': {
          color: 'var(--mui-palette-action-disabled)'
        },
        '& .MuiOutlinedInput-input': {
          height: '1.4375em'
        }
      },
      input: {
        '& + .MuiAutocomplete-endAdornment': {
          insetInlineEnd: '1rem',
          '& i, & svg': {
            fontSize: '1.25rem',
            color: 'var(--mui-palette-text-primary)'
          },
          '& .MuiAutocomplete-clearIndicator': {
            padding: 2
          }
        },
        '&.MuiInputBase-inputSizeSmall + .MuiAutocomplete-endAdornment': {
          '& i, & svg': {
            fontSize: '1rem'
          }
        }
      },
      paper: ({ theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#151515' : '#F5F4F7',
        border: '1px solid var(--mui-palette-divider)',
        borderRadius: 'var(--mui-shape-customBorderRadius-md)',
        boxShadow: '0 10px 28px rgb(0 0 0 / 0.14)',
        ...(skin !== 'bordered' && {
          boxShadow: '0 10px 28px rgb(0 0 0 / 0.14)',
          marginBlockStart: '0.125rem'
        })
      }),
      listbox: ({ theme }) => ({
        maxHeight: 320,
        overflowY: 'auto',
        '& .MuiAutocomplete-option': {
          paddingBlock: theme.spacing(2),
          marginInline: theme.spacing(2),
          marginBlock: theme.spacing(0.5),
          borderRadius: 'var(--mui-shape-borderRadius)',
          '&[aria-selected="true"]': {
            backgroundColor: 'var(--mui-palette-primary-lightOpacity)',
            color: 'var(--mui-palette-primary-main)',
            '&.Mui-focused, &.Mui-focusVisible': {
              backgroundColor: 'var(--mui-palette-primary-mainOpacity)'
            }
          }
        },
        '& .MuiAutocomplete-option.Mui-focusVisible': {
          backgroundColor: 'var(--mui-palette-action-hover)'
        }
      })
    }
  }
})

export default autocomplete
