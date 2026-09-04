'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import { getContractDetail } from '@/actions/contracts'
import PrintLayout from '@/components/print/PrintLayout'
import { formatContractDuration, toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

const SummaryCell = ({ label, children, colSpan = 1 }) => (
  <>
    <th className='border border-gray-200 bg-gray-50 p-2 text-start'>{label}</th>
    <td colSpan={colSpan} className='border border-gray-200 p-2'>
      {children || '—'}
    </td>
  </>
)

const ContractPrintModal = ({ open, contractId, setup, locale, dictionary, other, onClose }) => {
  const [contract, setContract] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !contractId) return undefined

    let active = true

    setContract(null)
    setError('')
    getContractDetail(contractId, { locale }).then(result => {
      if (!active) return
      if (result.success) setContract(result.data)
      else setError(result.error || dictionary.messages.loadFailed)
    })

    return () => {
      active = false
    }
  }, [contractId, dictionary.messages.loadFailed, locale, open])

  const duration = contract ? formatContractDuration(contract.duration_option, contract.contract_duration) || '—' : '—'

  const document = contract && (
    <PrintLayout
      title={other ? contract.title || 'OFFICIAL AGREEMENT' : 'CUSTOMER SERVICE AGREEMENT'}
      documentNumber={contract.contract_number}
      date={toDateInputValue(contract.start_date)}
      metadata={[{ label: dictionary.fields.endDate, value: toDateInputValue(contract.end_date) }]}
      setup={setup}
      labels={{
        reference: dictionary.table.number,
        issuedDate: dictionary.fields.startDate,
        signatures: 'Signatures',
        recipientSignature: other ? 'Party A Signature' : 'Authorized Client Representative',
        authorizedRepresentative: other ? 'Party B Signature' : 'Account Manager / Director Signature',
        employeeSignatureLine: other ? 'Party A Signature' : 'Authorized Client Representative',
        employerSignatureLine: other ? 'Party B Signature' : 'Account Manager / Director Signature'
      }}
      recipientName={other ? contract.vendor?.contact_name : contract.client?.primary_contact_name}
      authorizedName={contract.account_manager?.full_name}
    >
      <div className='flex flex-col gap-6 pb-2'>
        {other ? (
          <>
            <section>
              <h2 className='enterprise-section-title'>Agreement Metadata</h2>
              <div className='grid grid-cols-2 gap-4'>
                <div className='rounded border border-gray-200 bg-gray-50/50 p-3 text-xs'>
                  <p>
                    <strong>{dictionary.fields.startDate}:</strong> {toDateInputValue(contract.start_date)}
                  </p>
                  <p>
                    <strong>{dictionary.fields.endDate}:</strong> {toDateInputValue(contract.end_date)}
                  </p>
                  <p>
                    <strong>{dictionary.fields.amount}:</strong>{' '}
                    {formatCurrency(contract.total_amount, locale, contract.currency)}
                  </p>
                </div>
                <div className='rounded border border-gray-200 bg-gray-50/50 p-3 text-xs'>
                  <p>
                    <strong>{dictionary.fields.serviceType}:</strong> {contract.contract_type?.label || '—'}
                  </p>
                  <p>
                    <strong>Renewal Status:</strong> {contract.renewal_status || '—'}
                  </p>
                  <p>
                    <strong>Third-Party Company / Vendor:</strong> {contract.vendor?.company_name || '—'}
                  </p>
                  <p>
                    <strong>Vendor Representative:</strong> {contract.vendor?.contact_name || '—'}
                  </p>
                  <p>
                    <strong>Vendor Email:</strong> {contract.vendor?.email || '—'}
                  </p>
                  <p>
                    <strong>Internal Owner:</strong> {contract.account_manager?.full_name || '—'}
                  </p>
                  <p>
                    <strong>{dictionary.fields.country}:</strong> {contract.country?.label || '—'}
                  </p>
                </div>
              </div>
            </section>
            <section>
              <h2 className='enterprise-section-title'>Agreement Terms & Clauses</h2>
              <div
                className='enterprise-legal-content print-document-body rounded border border-gray-200 bg-white px-4 py-3 text-justify text-xs leading-relaxed text-gray-800'
                dangerouslySetInnerHTML={{
                  __html: contract.content_html || '<p>No agreement template was saved with this contract.</p>'
                }}
              />
            </section>
          </>
        ) : (
          <>
            <section>
              <h2 className='enterprise-section-title'>Parties to the Agreement</h2>
              <div className='grid grid-cols-2 gap-4'>
                <div className='rounded border border-gray-200 bg-gray-50/50 p-3 text-xs'>
                  <p>
                    <strong>Party A — Service Provider</strong>
                  </p>
                  <p>{setup.company_name}</p>
                  <p>{contract.account_manager?.full_name || setup.signatory_name}</p>
                </div>
                <div className='rounded border border-gray-200 bg-gray-50/50 p-3 text-xs'>
                  <p>
                    <strong>Party B — Client</strong>
                  </p>
                  <p>{contract.client?.company_name || '—'}</p>
                  <p>{contract.client?.primary_contact_name || '—'}</p>
                  <p>{contract.client?.address || '—'}</p>
                </div>
              </div>
            </section>
            <section>
              <h2 className='enterprise-section-title'>Terms & Contract Summary</h2>
              <table className='w-full border-collapse text-xs'>
                <tbody>
                  <tr>
                    <SummaryCell label='Contract Type'>{contract.contract_type?.label}</SummaryCell>
                    <SummaryCell label={dictionary.fields.level}>{contract.level?.label}</SummaryCell>
                  </tr>
                  <tr>
                    <SummaryCell label={dictionary.fields.startDate}>
                      {toDateInputValue(contract.start_date)}
                    </SummaryCell>
                    <SummaryCell label={dictionary.fields.endDate}>{toDateInputValue(contract.end_date)}</SummaryCell>
                  </tr>
                  <tr>
                    <SummaryCell label={dictionary.fields.duration}>{duration}</SummaryCell>
                    <SummaryCell label={dictionary.fields.autoRenew}>
                      {contract.auto_renew ? dictionary.common.yes : dictionary.common.no}
                    </SummaryCell>
                  </tr>
                  <tr>
                    <SummaryCell label={dictionary.fields.amount} colSpan={3}>
                      <strong>{formatCurrency(contract.total_amount, locale, contract.currency)}</strong>
                      {' (Base: '}
                      {formatCurrency(contract.amount_base, locale, setup.currency_code || 'AFN')}
                      {')'}
                    </SummaryCell>
                  </tr>
                </tbody>
              </table>
            </section>
            <section>
              <h2 className='enterprise-section-title'>Agreement Terms & Clauses</h2>
              <div
                className='enterprise-legal-content print-document-body rounded border border-gray-200 bg-white px-4 py-3 text-justify text-xs leading-relaxed text-gray-800'
                dangerouslySetInnerHTML={{
                  __html: contract.content_html || '<p>No agreement template was saved with this contract.</p>'
                }}
              />
            </section>
          </>
        )}
      </div>
    </PrintLayout>
  )

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle className='no-print flex justify-between gap-3'>
        <span>{other ? 'OFFICIAL AGREEMENT' : 'CUSTOMER SERVICE AGREEMENT'}</span>
        <div className='flex gap-2'>
          <Button
            disabled={!contract}
            variant='contained'
            startIcon={<i className='tabler-printer' />}
            onClick={() => window.print()}
          >
            Print Document
          </Button>
          <Button variant='tonal' onClick={onClose}>
            {dictionary.actions.cancel}
          </Button>
        </div>
      </DialogTitle>
      <DialogContent dividers className='bg-gray-50 p-2 sm:p-6'>
        {error ? (
          <Alert severity='error'>{error}</Alert>
        ) : (
          document || (
            <div className='flex min-h-80 items-center justify-center'>
              <CircularProgress />
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ContractPrintModal
