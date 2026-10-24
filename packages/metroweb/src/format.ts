// en-US formats the phone uses for times and short dates.
export const formatTimeOfDay = (hour: number, minute: number) =>
  `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`

export const formatShortDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
