const DAY_IN_MILLISECONDS = 86_400_000

export const parseLeaveDate = value => new Date(`${value}T00:00:00.000Z`)

export const leaveDateToString = value => value.toISOString().slice(0, 10)

export const getKabulToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kabul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

export const calculateLeaveDays = (startDate, endDate) => {
  const difference = parseLeaveDate(endDate).getTime() - parseLeaveDate(startDate).getTime()

  return Number.isFinite(difference) ? Math.floor(difference / DAY_IN_MILLISECONDS) + 1 : 0
}
