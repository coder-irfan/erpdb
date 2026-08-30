const popover = skin => ({
  MuiPopover: {
    defaultProps: {
      transitionDuration: 300
    },
    styleOverrides: {
      paper: ({ theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#151515' : '#F5F4F7',
        border: '1px solid var(--mui-palette-divider)',
        borderRadius: 'var(--mui-shape-customBorderRadius-md)',
        ...(skin === 'bordered'
          ? { boxShadow: '0 8px 22px rgb(0 0 0 / 0.12)' }
          : {
              boxShadow: '0 10px 28px rgb(0 0 0 / 0.14)'
            })
      })
    }
  }
})

export default popover
