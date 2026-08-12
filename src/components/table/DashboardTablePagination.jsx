'use client'

import Pagination from '@mui/material/Pagination'
import TablePagination from '@mui/material/TablePagination'

const PaginationActions = ({ className, count, page, rowsPerPage, onPageChange }) => (
  <Pagination
    className={className}
    color='primary'
    count={Math.max(1, Math.ceil(count / rowsPerPage))}
    page={page + 1}
    shape='rounded'
    showFirstButton
    showLastButton
    variant='tonal'
    onChange={(_, nextPage) => onPageChange(null, nextPage - 1)}
  />
)

const DashboardTablePagination = ({
  count,
  page,
  rowsPerPage,
  rowsPerPageOptions = [10, 25, 50],
  rowsPerPageLabel,
  ofLabel = 'of',
  onPageChange,
  onRowsPerPageChange
}) => (
  <TablePagination
    component='div'
    count={count}
    page={page}
    rowsPerPage={rowsPerPage}
    rowsPerPageOptions={rowsPerPageOptions}
    ActionsComponent={PaginationActions}
    labelRowsPerPage={rowsPerPageLabel}
    labelDisplayedRows={({ from, to, count: total }) => `${from}–${to} ${ofLabel} ${total}`}
    onPageChange={onPageChange}
    onRowsPerPageChange={onRowsPerPageChange}
  />
)

export default DashboardTablePagination
