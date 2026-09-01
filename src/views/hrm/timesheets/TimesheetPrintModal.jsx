'use client'

import PrintPreviewModal from '@/components/print/PrintPreviewModal'

import TimesheetPrintDocument from './TimesheetPrintDocument'

const TimesheetPrintModal = ({ open, staff, records, period, reportDate, setup, locale, dictionary, onClose }) => {
  if (!records) return null

  const reference = reportDate || period
  const description = staff ? `${staff.full_name} - ${reference}` : reference

  return (
    <PrintPreviewModal
      open={open}
      title={staff ? dictionary.print.individualTitle : dictionary.print.title}
      description={description}
      printLabel={dictionary.actions.print}
      closeLabel={dictionary.actions.cancel}
      landscape
      onClose={onClose}
    >
      <TimesheetPrintDocument
        staff={staff}
        records={records}
        period={period}
        reportDate={reportDate}
        setup={setup}
        locale={locale}
        dictionary={dictionary}
      />
    </PrintPreviewModal>
  )
}

export default TimesheetPrintModal
