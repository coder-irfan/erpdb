// MUI Imports
import CircularProgress from '@mui/material/CircularProgress'

const LoadingButtonContent = ({ loading, loadingLabel = 'Please wait...', children }) => (
  <span className='flex items-center justify-center gap-2'>
    {loading && <CircularProgress size={18} color='inherit' />}
    {loading ? loadingLabel : children}
  </span>
)

export default LoadingButtonContent
