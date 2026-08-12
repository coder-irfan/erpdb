import Skeleton from '@mui/material/Skeleton'

const TableSkeletonRows = ({ columns, rows = 5 }) =>
  Array.from({ length: rows }, (_, rowIndex) => (
    <tr key={`skeleton-row-${rowIndex}`} aria-hidden='true'>
      {Array.from({ length: columns }, (_, columnIndex) => (
        <td key={`skeleton-cell-${rowIndex}-${columnIndex}`}>
          <Skeleton variant='rounded' height={24} animation='wave' />
        </td>
      ))}
    </tr>
  ))

export default TableSkeletonRows
