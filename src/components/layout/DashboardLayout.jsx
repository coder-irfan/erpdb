'use client'

import HorizontalLayout from '@layouts/HorizontalLayout'
import VerticalLayout from '@layouts/VerticalLayout'
import HorizontalHeader from '@components/layout/horizontal/Header'
import HorizontalFooter from '@components/layout/horizontal/Footer'
import VerticalNavigation from '@components/layout/vertical/Navigation'
import VerticalNavbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import { LayoutPreferenceProvider, useLayoutPreference } from '@/contexts/layoutPreferenceContext'

const ActiveDashboardLayout = ({ children, dictionary }) => {
  const { layout, isCollapsed } = useLayoutPreference()

  if (layout === 'topbar') {
    return (
      <HorizontalLayout header={<HorizontalHeader dictionary={dictionary} />} footer={<HorizontalFooter />}>
        {children}
      </HorizontalLayout>
    )
  }

  return (
    <VerticalLayout
      navigation={<VerticalNavigation dictionary={dictionary} defaultCollapsed={isCollapsed} />}
      navbar={<VerticalNavbar dictionary={dictionary} />}
      footer={<VerticalFooter />}
    >
      {children}
    </VerticalLayout>
  )
}

const DashboardLayout = ({ children, dictionary, initialLayout, initialCollapsed }) => (
  <LayoutPreferenceProvider initialLayout={initialLayout} initialCollapsed={initialCollapsed}>
    <ActiveDashboardLayout dictionary={dictionary}>{children}</ActiveDashboardLayout>
  </LayoutPreferenceProvider>
)

export default DashboardLayout
