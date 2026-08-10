'use client'

// Third-party Imports
import classnames from 'classnames'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import useLayoutInit from '@core/hooks/useLayoutInit'

// Util Imports
import { blankLayoutClasses } from './utils/layoutClasses'

const BlankLayout = props => {
  // Props
  const { children, className, systemMode } = props

  // Hooks
  const { settings } = useSettings()

  useLayoutInit(systemMode)

  return (
    <div
      className={classnames(blankLayoutClasses.root, 'blank-page-wrapper is-full bs-full', className)}
      data-skin={settings.skin}
    >
      {children}
    </div>
  )
}

export default BlankLayout
