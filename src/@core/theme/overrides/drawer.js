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
      paper: {
        ...(skin !== 'bordered' && {
          boxShadow: 'var(--mui-customShadows-lg)'
        })
      }
    }
  }
})

export default drawer
