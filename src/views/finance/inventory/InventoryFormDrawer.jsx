'use client'

import { useEffect, useMemo } from 'react'

import { valibotResolver } from '@hookform/resolvers/valibot'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import LoadingButtonContent from '@/components/LoadingButtonContent'
import FormSectionCards from '@/components/forms/FormSectionCards'
import { inventoryItemSchema } from '@/schemas/inventory'
import { convertToBaseCurrency, formatCurrency, toFiniteNumber } from '@/utils/formatCurrency'

const defaults = (options, item) => ({
  name: item?.name || '',
  sku_code: item?.sku_code || '',
  category_id:
    item?.category_id || options.categories.find(option => option.is_default)?.id || options.categories[0]?.id || '',
  quantity_in_stock: String(item?.quantity_in_stock ?? 0),
  unit_price: item?.unit_price || '',
  reorder_level: String(item?.reorder_level ?? 5),
  currency: item?.currency || options.baseCurrency || 'AFN',
  exchange_rate: item?.exchange_rate || String(options.exchangeRate || '65')
})

const InventoryFormDrawer = ({ open, item, options, locale, dictionary, onClose, onSaved }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: valibotResolver(inventoryItemSchema(dictionary.validation)),
    defaultValues: defaults(options, item)
  })

  const unitPrice = useWatch({ control, name: 'unit_price' })
  const quantity = useWatch({ control, name: 'quantity_in_stock' })
  const currency = useWatch({ control, name: 'currency' })
  const exchangeRate = useWatch({ control, name: 'exchange_rate' })

  const usdUnitValue = useMemo(
    () => convertToBaseCurrency(unitPrice, currency, exchangeRate, 'USD'),
    [currency, exchangeRate, unitPrice]
  )

  const usdTotalValue = usdUnitValue * Number(quantity || 0)

  useEffect(() => {
    if (open) reset(defaults(options, item))
  }, [item, open, options, reset])

  const submit = async values => {
    const response = await fetch(item ? `/api/finance/inventory/${item.id}` : '/api/finance/inventory', {
      method: item ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, locale })
    })

    const result = await response.json()

    if (!response.ok || !result.success) return toast.error(result.error || dictionary.messages.operationFailed)

    toast.success(result.message)
    onClose()
    await onSaved()
  }

  const field = (name, label, props = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field: controllerField }) => (
        <CustomTextField
          {...controllerField}
          {...props}
          fullWidth
          value={controllerField.value ?? ''}
          label={label}
          error={Boolean(errors[name])}
          helperText={errors[name]?.message || props.helperText}
        />
      )}
    />
  )

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      slotProps={{ paper: { className: 'is-full sm:is-[680px]' } }}
    >
      <div className='form-surface-header flex items-start justify-between gap-4 border-be border-divider p-5'>
        <div>
          <Typography variant='h5'>{item ? dictionary.form.editTitle : dictionary.form.addTitle}</Typography>
          <Typography color='text.secondary'>{dictionary.form.description}</Typography>
        </div>
        <IconButton onClick={onClose} disabled={isSubmitting}>
          <i className='tabler-x' />
        </IconButton>
      </div>
      <form
        className='form-surface-scroll flex flex-1 flex-col gap-5 px-5 pt-5'
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <FormSectionCards
          labels={[dictionary.tabs?.general || 'Item information', dictionary.tabs?.valuation || 'Stock and valuation']}
        >
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {field('name', dictionary.fields.name)}
            {field('sku_code', dictionary.fields.sku, {
              disabled: true,
              placeholder: 'Auto-generated (for example ITM-010)'
            })}
            <Controller
              name='category_id'
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  select
                  fullWidth
                  label={dictionary.fields.category}
                  error={Boolean(errors.category_id)}
                  helperText={errors.category_id?.message}
                >
                  {options.categories.map(option => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
            {field('quantity_in_stock', dictionary.fields.quantity, {
              type: 'number',
              disabled: Boolean(item),
              inputProps: { min: 0, step: 1 }
            })}
            <Controller
              name='reorder_level'
              control={control}
              render={({ field: controllerField }) => (
                <CustomTextField
                  {...controllerField}
                  fullWidth
                  type='number'
                  value={controllerField.value ?? ''}
                  label={dictionary.fields.reorderLevel}
                  inputProps={{ min: 0, step: 1 }}
                  error={Boolean(errors.reorder_level)}
                  helperText={errors.reorder_level?.message}
                />
              )}
            />
            {field('unit_price', 'Purchase Unit Cost', { type: 'number', inputProps: { min: 0.01, step: '0.01' } })}
            <Controller
              name='currency'
              control={control}
              render={({ field }) => (
                <CustomTextField {...field} select fullWidth label={dictionary.fields.currency}>
                  <MenuItem value='AFN'>AFN</MenuItem>
                  <MenuItem value='USD'>USD</MenuItem>
                </CustomTextField>
              )}
            />
            {field('exchange_rate', dictionary.fields.exchangeRate, {
              type: 'number',
              inputProps: { min: 0.0001, step: '0.0001' }
            })}
          </div>
          <div className='grid grid-cols-2 gap-4 rounded border border-divider p-4'>
            <div>
              <Typography variant='caption' color='text.secondary'>
                Calculated USD Unit Value
              </Typography>
              <Typography className='font-semibold text-primary'>
                {formatCurrency(usdUnitValue, locale, 'USD')}
              </Typography>
            </div>
            <div>
              <Typography variant='caption' color='text.secondary'>
                Calculated USD Total Value
              </Typography>
              <Typography className='font-semibold text-primary'>
                {formatCurrency(toFiniteNumber(usdTotalValue), locale, 'USD')}
              </Typography>
            </div>
          </div>
          <Typography variant='caption' color='text.secondary'>
            {dictionary.form.statusNotice}
          </Typography>
        </FormSectionCards>
        <div className='form-surface-actions -mx-5 -mb-5 mt-auto flex justify-end gap-3 px-5 pt-5'>
          <Button variant='tonal' color='secondary' disabled={isSubmitting} onClick={onClose}>
            {dictionary.actions.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={isSubmitting}>
            <LoadingButtonContent loading={isSubmitting} loadingLabel={dictionary.actions.saving}>
              {item ? dictionary.actions.save : dictionary.actions.create}
            </LoadingButtonContent>
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export default InventoryFormDrawer
