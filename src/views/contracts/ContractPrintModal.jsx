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
import { toDateInputValue } from '@/utils/contractDuration'
import { formatCurrency } from '@/utils/formatCurrency'

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

    return () => { active = false }
  }, [contractId, dictionary.messages.loadFailed, locale, open])

  const document = contract && <PrintLayout title={other ? (contract.title || 'OFFICIAL AGREEMENT') : 'CUSTOMER SERVICE AGREEMENT'} documentNumber={contract.contract_number} date={toDateInputValue(contract.start_date)} setup={setup} labels={{ reference: dictionary.table.number, issuedDate: dictionary.fields.startDate, signatures: 'Signatures', recipientSignature: other ? 'Party A Signature' : 'Authorized Client Representative', authorizedRepresentative: other ? 'Party B Signature' : 'Account Manager / Director Signature', employeeSignatureLine: other ? 'Party A Signature' : 'Authorized Client Representative', employerSignatureLine: other ? 'Party B Signature' : 'Account Manager / Director Signature' }} recipientName={contract.client?.primary_contact_name} authorizedName={contract.account_manager?.full_name}>
    <div className='flex flex-col gap-6 pb-2'>
      {other ? <section><h2 className='enterprise-section-title'>Agreement Metadata</h2><div className='grid grid-cols-2 gap-4'><div className='rounded border border-gray-200 bg-gray-50/50 p-3 text-xs'><p><strong>{dictionary.fields.startDate}:</strong> {toDateInputValue(contract.start_date)}</p><p><strong>{dictionary.fields.endDate}:</strong> {toDateInputValue(contract.end_date)}</p><p><strong>{dictionary.fields.amount}:</strong> {formatCurrency(contract.total_amount, locale, contract.currency)}</p></div><div className='rounded border border-gray-200 bg-gray-50/50 p-3 text-xs'><p><strong>{dictionary.fields.serviceType}:</strong> {contract.contract_type?.label || '—'}</p><p><strong>Renewal Status:</strong> {contract.renewal_status || '—'}</p><p><strong>{dictionary.fields.client}:</strong> {contract.client?.company_name || '—'}</p></div></div></section> : <><section><h2 className='enterprise-section-title'>Parties to the Agreement</h2><div className='grid grid-cols-2 gap-4'><div className='rounded border border-gray-200 bg-gray-50/50 p-3 text-xs'><p><strong>Party A — Service Provider</strong></p><p>{setup.company_name}</p><p>{contract.account_manager?.full_name || setup.signatory_name}</p></div><div className='rounded border border-gray-200 bg-gray-50/50 p-3 text-xs'><p><strong>Party B — Client</strong></p><p>{contract.client?.company_name || '—'}</p><p>{contract.client?.primary_contact_name || '—'}</p><p>{contract.client?.address || '—'}</p></div></div></section><section><h2 className='enterprise-section-title'>Terms & Contract Summary</h2><table className='w-full border-collapse text-xs'><tbody><tr><th className='border border-gray-200 bg-gray-50 p-2 text-start'>Contract Type</th><td className='border border-gray-200 p-2'>{contract.contract_type?.label || '—'}</td><th className='border border-gray-200 bg-gray-50 p-2 text-start'>{dictionary.fields.level}</th><td className='border border-gray-200 p-2'>{contract.level?.label || '—'}</td></tr><tr><th className='border border-gray-200 bg-gray-50 p-2 text-start'>{dictionary.fields.duration}</th><td className='border border-gray-200 p-2'>{contract.duration_option?.label || contract.contract_duration || '—'}</td><th className='border border-gray-200 bg-gray-50 p-2 text-start'>{dictionary.fields.autoRenew}</th><td className='border border-gray-200 p-2'>{contract.auto_renew ? dictionary.common.yes : dictionary.common.no}</td></tr><tr><th className='border border-gray-200 bg-gray-50 p-2 text-start'>{dictionary.fields.amount}</th><td colSpan={3} className='border border-gray-200 p-2 font-semibold'>{formatCurrency(contract.total_amount, locale, contract.currency)} (Base: {formatCurrency(contract.amount_base, locale, setup.currency_code || 'AFN')})</td></tr></tbody></table></section></>}</div>
  </PrintLayout>

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'><DialogTitle className='no-print flex justify-between gap-3'><span>{other ? 'OFFICIAL AGREEMENT' : 'CUSTOMER SERVICE AGREEMENT'}</span><div className='flex gap-2'><Button disabled={!contract} variant='contained' startIcon={<i className='tabler-printer' />} onClick={() => window.print()}>Print Document</Button><Button variant='tonal' onClick={onClose}>{dictionary.actions.cancel}</Button></div></DialogTitle><DialogContent dividers className='bg-gray-50 p-2 sm:p-6'>{error ? <Alert severity='error'>{error}</Alert> : document || <div className='flex min-h-80 items-center justify-center'><CircularProgress /></div>}</DialogContent></Dialog>
}

export default ContractPrintModal
