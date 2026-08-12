import Link from 'next/link'
import { notFound } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'

import { getStaffContractById } from '@/actions/hrm/contracts'
import PrintButton from '@/components/common/PrintButton'
import PrintLayout from '@/components/common/PrintLayout'
import { getDictionary } from '@/utils/getDictionary'

const StaffContractPrintPage = async props => {
  const { id, lang } = await props.params
  const [dictionary, result] = await Promise.all([getDictionary(lang), getStaffContractById(id, { locale: lang })])

  if (result.code === 'CONTRACT_NOT_FOUND') notFound()

  return (
    <div className='print-page-shell -m-6 min-h-screen bg-actionHover p-6'>
      <div className='no-print mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3'>
        <Link href={`/${lang}/hrm/contracts`}>
          <Button component='span' variant='tonal' color='secondary' startIcon={<i className='tabler-arrow-left' />}>
            {dictionary.hrmContracts.actions.back}
          </Button>
        </Link>
        {result.success && <PrintButton label={dictionary.hrmContracts.actions.printSavePdf} />}
      </div>
      {result.success ? (
        <PrintLayout
          contract={result.data.contract}
          setup={result.data.setup}
          dictionary={dictionary.hrmContracts}
          locale={lang}
        />
      ) : (
        <Alert severity='error' className='mx-auto max-w-[210mm]'>
          {result.error}
        </Alert>
      )}
    </div>
  )
}

export default StaffContractPrintPage
