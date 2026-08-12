import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

const TableEmptyStateRow = ({ colSpan, icon = 'tabler-file-x', title, description, actionLabel, onAction }) => (
  <tr>
    <td colSpan={colSpan} className='!p-0'>
      <div className='flex flex-col items-center justify-center px-4 py-10 text-center'>
        <div className='mb-4 flex size-16 items-center justify-center rounded-full bg-primaryLighter text-primary'>
          <i className={`${icon} text-5xl opacity-70`} />
        </div>
        <Typography variant='h6' color='text.primary'>
          {title}
        </Typography>
        {description && (
          <Typography color='text.secondary' className='mt-1 max-is-[460px]'>
            {description}
          </Typography>
        )}
        {actionLabel && onAction && (
          <Button variant='tonal' color='secondary' startIcon={<i className='tabler-plus' />} onClick={onAction} className='mt-5'>
            {actionLabel}
          </Button>
        )}
      </div>
    </td>
  </tr>
)

export default TableEmptyStateRow
