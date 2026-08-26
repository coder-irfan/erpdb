const tablePagination = {
  MuiTablePagination: {
    styleOverrides: {
      toolbar: ({ theme }) => ({
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing(2),
        minHeight: 64,
        padding: `${theme.spacing(3)} ${theme.spacing(5)} !important`,
        borderBlockStart: '1px solid var(--mui-palette-divider)',
        '& .MuiTablePagination-spacer': {
          display: 'none'
        },
        '& .MuiTablePagination-actions': {
          order: 1,
          marginInline: '0 auto'
        },
        '& .MuiTablePagination-selectLabel': {
          order: 2,
          margin: 0
        },
        '& .MuiInputBase-root': {
          order: 3,
          margin: 0
        },
        '& .MuiTablePagination-displayedRows': {
          order: 4,
          margin: 0,
          color: 'var(--mui-palette-text-secondary)'
        },
        [theme.breakpoints.down('sm')]: {
          minHeight: 52,
          padding: `${theme.spacing(1.5)} ${theme.spacing(2)} !important`,
          fontSize: theme.typography.caption.fontSize,
          justifyContent: 'center',
          '& .MuiTablePagination-actions': {
            display: 'flex',
            justifyContent: 'center',
            inlineSize: '100%',
            marginInline: 0
          },
          '& .MuiPaginationItem-root': {
            minWidth: 28,
            height: 28,
            margin: 1,
            fontSize: theme.typography.caption.fontSize
          }
        }
      }),
      select: {
        '& ~ i, & ~ svg': {
          right: '2px !important'
        }
      }
    }
  }
}

export default tablePagination
