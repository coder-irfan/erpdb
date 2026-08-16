const popover = skin => ({
  MuiPopover: {
    defaultProps: {
      transitionDuration: 300
    },
    styleOverrides: {
      paper: {
        ...(skin === 'bordered'
          ? { boxShadow: 'none', border: '1px solid var(--mui-palette-divider)' }
          : {
              boxShadow: 'var(--mui-customShadows-sm)'
            })
      }
    }
  }
})

export default popover
