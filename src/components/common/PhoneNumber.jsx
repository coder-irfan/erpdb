const PhoneNumber = ({ value, className = '' }) => {
  if (!value) return null

  return <span dir='ltr' className={`phone-number inline-block ${className}`}>{value}</span>
}

export default PhoneNumber
