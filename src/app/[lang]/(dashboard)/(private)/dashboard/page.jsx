// MUI Imports
import Grid from '@mui/material/Grid'

// Components Imports
import WebsiteAnalyticsSlider from '@views/dashboards/analytics/WebsiteAnalyticsSlider'
import LineAreaDailySalesChart from '@views/dashboards/analytics/LineAreaDailySalesChart'
import SalesOverview from '@views/dashboards/analytics/SalesOverview'
import EarningReports from '@views/dashboards/analytics/EarningReports'
import SupportTracker from '@views/dashboards/analytics/SupportTracker'
import SalesByCountries from '@views/dashboards/analytics/SalesByCountries'
import TotalEarning from '@views/dashboards/analytics/TotalEarning'
import MonthlyCampaignState from '@views/dashboards/analytics/MonthlyCampaignState'
import SourceVisits from '@views/dashboards/analytics/SourceVisits'
import ProjectsTable from '@views/dashboards/analytics/ProjectsTable'

// Data Imports
import { getProfileData } from '@/app/server/actions'

const Dashboard = async () => {
  const data = await getProfileData()

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <WebsiteAnalyticsSlider />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <LineAreaDailySalesChart />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <SalesOverview />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <EarningReports />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <SupportTracker />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <SalesByCountries />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <TotalEarning />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <MonthlyCampaignState />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <SourceVisits />
      </Grid>
      <Grid size={{ xs: 12, lg: 8 }}>
        <ProjectsTable projectTable={data?.users.profile.projectTable} />
      </Grid>
    </Grid>
  )
}

export default Dashboard
