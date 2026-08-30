import { Children } from 'react'

const splitIntoSections = (children, labels) => {
  const initialItems = Children.toArray(children)

  const items = initialItems.length === 1 && initialItems[0]?.type === 'div'
    ? Children.toArray(initialItems[0].props.children)
    : initialItems

  const titledSections = []
  let currentSection = null

  items.forEach(item => {
    if (item?.type?.name === 'SectionTitle') {
      if (currentSection) titledSections.push(currentSection)
      currentSection = { label: item.props.children, items: [] }

      return
    }

    if (currentSection) currentSection.items.push(item)
  })

  if (currentSection) titledSections.push(currentSection)
  if (titledSections.length) return titledSections

  const sectionCount = Math.min(Math.max(labels.length, 1), 4)
  const size = Math.ceil(items.length / sectionCount)

  return Array.from({ length: sectionCount }, (_, index) => ({
    label: labels[index],
    items: items.slice(index * size, (index + 1) * size)
  })).filter(section => section.items.length)
}

/** Renders every form section in one continuous scroll view. */
const FormSectionCards = ({ children, labels = ['General information'] }) => {
  const sections = splitIntoSections(children, labels)

  return (
    <div className='col-span-full flex w-full min-w-0 self-stretch flex-col gap-4 sm:col-span-2'>
      {sections.map((section, index) => (
        <section key={`${section.label}-${index}`} className='form-section-card col-span-full w-full min-w-0 self-stretch space-y-4'>
          <h4 className='border-be border-divider/80 pb-2 text-xs font-semibold uppercase tracking-wider text-textSecondary'>
            {section.label}
          </h4>
          <div className='grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2'>
            {section.items}
          </div>
        </section>
      ))}
    </div>
  )
}

export default FormSectionCards
