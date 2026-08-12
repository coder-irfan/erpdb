'use client'

import Button from '@mui/material/Button'

const PrintButton = ({ label }) => (
  <Button variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>
    {label}
  </Button>
)

export default PrintButton
