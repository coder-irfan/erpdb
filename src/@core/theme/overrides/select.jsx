// React Imports
import React from 'react'

const SelectIcon = () => {
  return <i className='tabler-chevron-down' />
}

const iconStyles = theme => ({
  userSelect: 'none',
  display: 'inline-block',
  fill: 'currentColor',
  flexShrink: 0,
  transition: theme.transitions.create('fill', {
    duration: theme.transitions.duration.shorter
  }),
  fontSize: '1.25rem',
  position: 'absolute',
  insetInlineEnd: '1rem',
  pointerEvents: 'none'
})

const select = {
  MuiSelect: {
    defaultProps: {
      displayEmpty: true,
      IconComponent: SelectIcon
    },
    styleOverrides: {
      select: ({ theme, ownerState }) => ({
        WebkitPaddingEnd: '44px !important',
        paddingInlineEnd: '44px !important',
        ...(ownerState.variant === 'outlined' && {
          height: '1.5em'
        }),
        '&[aria-expanded="true"] ~ i, &[aria-expanded="true"] ~ svg': {
          transform: 'rotate(180deg)'
        },
        '& ~ i, & ~ svg': iconStyles(theme),
        '&.MuiInputBase-inputSizeSmall': {
          '& ~ i, & ~ svg': {
            height: '1.125rem',
            width: '1.125rem'
          }
        },
        '&:not(aria-label="Without label") ~ .MuiOutlinedInput-notchedOutline > legend > span': {
          paddingInline: '5px'
        },
        [theme.breakpoints.down('sm')]: {
          paddingBlock: theme.spacing(0.5),
          paddingInline: theme.spacing(1.5),
          minHeight: '1.125rem',
          fontSize: theme.typography.caption.fontSize
        }
      })
    }
  },
  MuiNativeSelect: {
    styleOverrides: {
      select: ({ theme }) => ({
        '& + i, & + svg': iconStyles(theme)
      })
    }
  }
}

export default select
