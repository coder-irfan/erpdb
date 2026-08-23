const menu = skin => ({
  MuiMenu: {
    defaultProps: {
      transitionDuration: 300,
      slotProps: {
        paper: {
          ...(skin === 'bordered' && { elevation: 0 }),
          sx: {
            maxHeight: 320,
            overflowY: 'auto'
          }
        }
      }
    },
    styleOverrides: {
      paper: ({ theme }) => ({
        maxHeight: 320,
        overflowY: 'auto',
        marginBlockStart: theme.spacing(0.5),
        backgroundColor: theme.palette.mode === 'dark' ? '#151515' : '#F5F4F7',
        boxShadow: '0 10px 28px rgb(0 0 0 / 0.14)',
        ...(skin !== 'bordered' && {
          boxShadow: '0 10px 28px rgb(0 0 0 / 0.14)'
        })
      })
    }
  },
  MuiMenuItem: {
    styleOverrides: {
      root: ({ theme }) => ({
        paddingBlock: theme.spacing(2),
        gap: theme.spacing(2),
        color: 'var(--mui-palette-text-primary)',
        marginInline: theme.spacing(2),
        borderRadius: 'var(--mui-shape-borderRadius)',
        '& i, & svg': {
          fontSize: '1.375rem'
        },
        '& .MuiListItemIcon-root': {
          minInlineSize: 0
        },
        '&:not(:last-of-type)': {
          marginBlockEnd: theme.spacing(0.5)
        },
        '&.Mui-selected': {
          backgroundColor: 'var(--mui-palette-primary-lightOpacity)',
          color: 'var(--mui-palette-primary-main)',
          '& .MuiListItemIcon-root': {
            color: 'var(--mui-palette-primary-main)'
          },
          '&:hover, &.Mui-focused, &.Mui-focusVisible': {
            backgroundColor: 'var(--mui-palette-primary-mainOpacity)'
          }
        },
        '&.Mui-disabled': {
          color: 'var(--mui-palette-text-disabled)',
          opacity: 0.45
        }
      })
    }
  }
})

export default menu
