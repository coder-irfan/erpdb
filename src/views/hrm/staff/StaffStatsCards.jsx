import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

const StaffStatsCards = ({ stats, dictionary }) => {
  const cards = [
    { key: 'total', label: dictionary.stats.total, icon: 'tabler-users', color: 'primary' },
    { key: 'active', label: dictionary.stats.active, icon: 'tabler-user-check', color: 'success' },
    { key: 'inactive', label: dictionary.stats.inactive, icon: 'tabler-user-pause', color: 'secondary' },
    { key: 'terminated', label: dictionary.stats.terminated, icon: 'tabler-user-x', color: 'error' }
  ]

  return (
    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4'>
      {cards.map(card => (
        <Card key={card.key}>
          <CardContent className='flex items-center justify-between gap-4'>
            <div>
              <Typography color='text.secondary'>{card.label}</Typography>
              <Typography variant='h4' className='mt-1'>
                {stats?.[card.key] ?? 0}
              </Typography>
            </div>
            <CustomAvatar skin='light' color={card.color} size={46}>
              <i className={`${card.icon} text-2xl`} />
            </CustomAvatar>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default StaffStatsCards
