'use client'

import Image from 'next/image'

const getInitials = user => {
  const name = user?.full_name || user?.fullName || user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ')

  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase() || '?'
}

const UserAvatar = ({ user, size = 40, className = '', alt, ...rest }) => {
  const image = user?.profile_image || user?.avatar || user?.image || user?.user?.image
  const label = alt || user?.full_name || user?.fullName || user?.name || 'User'

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primaryLighter font-bold text-primary ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.34)) }}
      aria-label={label}
      {...rest}
    >
      {image ? (
        <Image src={image} alt={label} width={size} height={size} unoptimized className='size-full object-cover' />
      ) : getInitials(user)}
    </span>
  )
}

export default UserAvatar
