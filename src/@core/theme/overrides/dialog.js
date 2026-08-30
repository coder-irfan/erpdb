const dialog = skin => ({
  MuiDialog: {
    defaultProps: {
      transitionDuration: 300
    },
    styleOverrides: {
      paper: ({ theme }) => ({
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--mui-shape-customBorderRadius-lg)',
        overflow: 'hidden',
        ...(skin !== 'bordered'
          ? {
              boxShadow: 'var(--mui-customShadows-lg)'
            }
          : {
              boxShadow: 'none'
            }),
        [theme.breakpoints.down('sm')]: {
          '&.MuiDialog-paperFullWidth': {
            width: '100%',
            maxWidth: 'none',
            height: '100dvh',
            maxHeight: 'none',
            minHeight: '100dvh',
            margin: 0,
            borderRadius: 0,
            '& .MuiDialogTitle-root': {
              position: 'sticky',
              top: 0,
              zIndex: 1,
              padding: theme.spacing(4)
            },
            '& .MuiDialogContent-root': {
              maxHeight: 'calc(100dvh - 76px)',
              overflowY: 'auto',
              padding: theme.spacing(4),
              fontSize: theme.typography.caption.fontSize
            },
            '& .MuiDialogTitle-root .MuiIconButton-root:last-child': {
              color: 'var(--mui-palette-error-main)',
              backgroundColor: 'var(--mui-palette-error-lighterOpacity)'
            }
          }
        }
      }),
      paperWidthMd: { maxWidth: 'min(1152px, calc(100% - 64px))' },
      paperWidthLg: { maxWidth: 'min(1152px, calc(100% - 64px))' },
      paperFullScreen: {
        borderRadius: 0
      }
    }
  },
  MuiDialogTitle: {
    defaultProps: {
      variant: 'h5'
    },
    styleOverrides: {
      root: ({ theme }) => ({
        padding: theme.spacing(6),
        position: 'sticky',
        top: 0,
        zIndex: 2,
        flexShrink: 0,
        borderBottom: '1px solid var(--mui-palette-divider)',
        '& + .MuiDialogActions-root': {
          paddingTop: 0
        }
      })
    }
  },
  MuiDialogContent: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: theme.spacing(6),
        flex: '1 1 auto',
        overflowY: 'auto',
        '& + .MuiDialogContent-root, & + .MuiDialogActions-root': {
          paddingTop: 0
        }
      })
    }
  },
  MuiDialogActions: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: theme.spacing(6),
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        flexShrink: 0,
        borderTop: '1px solid var(--mui-palette-divider)',
        '& .MuiButtonBase-root:not(:first-of-type)': {
          marginInlineStart: theme.spacing(4)
        },
        '&:where(.dialog-actions-dense)': {
          padding: theme.spacing(3),
          '& .MuiButton-text': {
            paddingInline: theme.spacing(3)
          }
        }
      })
    }
  }
})

export default dialog
