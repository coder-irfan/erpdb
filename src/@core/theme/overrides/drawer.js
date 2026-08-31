const drawer = skin => ({
  MuiDrawer: {
    defaultProps: {
      transitionDuration: 300,
      ...(skin === 'bordered' && {
        PaperProps: {
          elevation: 0
        }
      })
    },
    styleOverrides: {
      paper: ({ theme }) => ({
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--mui-palette-divider)',
        maxHeight: '100dvh',
        overflow: 'hidden',
        ...(skin !== 'bordered' && {
          boxShadow: 'var(--mui-customShadows-lg)'
        }),
        [theme.breakpoints.down('sm')]: {
          width: '100% !important',
          height: '100dvh',
          maxHeight: '100dvh',
          borderRadius: 0
        }
      })
    }
  }
})

export default drawer
