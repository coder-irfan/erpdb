'use client'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import useLayoutInit from '@core/hooks/useLayoutInit'

const LayoutWrapper = props => {
  // Props
  const { systemMode, children } = props

  // Hooks
  const { settings } = useSettings()

  useLayoutInit(systemMode)

  return (
    <div className='flex flex-col flex-auto' data-skin={settings.skin}>
      {children}
    </div>
  )
}

export default LayoutWrapper
