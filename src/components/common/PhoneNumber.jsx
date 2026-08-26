import QuickContact from './QuickContact'

const PhoneNumber = ({ value, className = '' }) => {
  if (!value) return null

  return (
    <QuickContact phone={value} className={className}>
      <span dir='ltr' className='phone-number inline-block'>
        {value}
      </span>
    </QuickContact>
  )
}

export default PhoneNumber
