// MUI Imports
import Pagination from '@mui/material/Pagination'
import Typography from '@mui/material/Typography'

const TablePaginationComponent = ({ table }) => {
  const totalRows = table.getFilteredRowModel().rows.length
  const firstRow = totalRows === 0 ? 0 : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1

  const lastRow = Math.min(
    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
    totalRows
  )

  return (
    <div className='flex flex-wrap items-center justify-center gap-3 border-bs pli-6 plb-[12.5px] sm:justify-between'>
      <Pagination
        shape='rounded'
        color='primary'
        variant='tonal'
        count={Math.max(1, Math.ceil(totalRows / table.getState().pagination.pageSize))}
        page={table.getState().pagination.pageIndex + 1}
        onChange={(_, page) => {
          table.setPageIndex(page - 1)
        }}
        showFirstButton
        showLastButton
      />
      <Typography color='text.disabled'>{`${firstRow}–${lastRow} of ${totalRows}`}</Typography>
    </div>
  )
}

export default TablePaginationComponent
