'use client'

// MUI Imports
import IconButton from '@mui/material/IconButton'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

const NavToggle = () => {
  const { toggleVerticalNav } = useVerticalNav()

  return (
    <IconButton
      color='inherit'
      className='text-textPrimary lg:hidden'
      aria-label='Open navigation menu'
      onClick={() => toggleVerticalNav()}
    >
      <i className='tabler-align-justified' />
    </IconButton>
  )
}

export default NavToggle
