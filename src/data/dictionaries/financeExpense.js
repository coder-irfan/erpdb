const translations = {
  en: {
    metrics: {
      total: 'Total Expenses',
      project: 'Project Expenses',
      overhead: 'Operational Overhead',
      month: "This Month's Spend",
      baseCurrency: 'Reported in {currency}',
      projectHint: 'Linked project costs',
      overheadHint: 'General company expenses',
      monthHint: 'Current calendar month'
    },
    filters: {
      search: 'Search expenses',
      searchPlaceholder: 'Details, project, or staff name...',
      type: 'Expense Type',
      project: 'Project',
      staff: 'Spent By',
      allTypes: 'All expense types',
      allProjects: 'All projects',
      allStaff: 'All staff',
      clear: 'Clear filters'
    },
    table: {
      details: 'Details & Receipt',
      type: 'Type',
      scope: 'Scope & Spent By',
      date: 'Expense Date',
      quantity: 'Qty & Unit Price',
      subtotal: 'Subtotal & Currency',
      actions: 'Actions'
    },
    actions: {
      add: 'Log Expense',
      view: 'View Details',
      edit: 'Edit Expense',
      delete: 'Delete Record',
      cancel: 'Cancel',
      create: 'Create Expense',
      save: 'Save Changes',
      saving: 'Saving...',
      close: 'Close',
      download: 'Download Receipt'
    },
    form: {
      addTitle: 'Log Expense',
      editTitle: 'Edit Expense',
      description: 'Record the expense scope, receipt, and locked transaction values.',
      calculation: 'Live Calculation',
      subtotalPreview: 'Transaction subtotal',
      basePreview: 'Base amount ({currency})',
      usdPreview: 'USD equivalent'
    },
    fields: {
      details: 'Expense Details',
      expenseType: 'Expense Type',
      project: 'Project',
      spentBy: 'Spent By',
      paymentMethod: 'Payment Method',
      expenseDate: 'Expense Date',
      quantity: 'Quantity',
      unitPrice: 'Unit Price',
      subtotal: 'Subtotal',
      currency: 'Currency',
      exchangeRate: 'USD / AFN Exchange Rate',
      baseAmount: 'Base Amount',
      totalUsd: 'USD Equivalent',
      receipt: 'Receipt Attachment'
    },
    placeholders: {
      details: 'Describe what was purchased or paid for',
      expenseType: 'Select expense type',
      project: 'General overhead / no project',
      spentBy: 'No assigned staff',
      paymentMethod: 'No payment method selected'
    },
    detail: {
      title: 'Expense Details',
      financial: 'Financial Breakdown',
      context: 'Expense Context',
      project: 'Linked Project',
      staff: 'Spent By',
      receipt: 'Receipt Preview',
      exchangeRate: 'Locked Exchange Rate',
      createdAt: 'Created',
      updatedAt: 'Last Updated'
    },
    upload: {
      upload: 'Upload',
      replace: 'Replace',
      remove: 'Remove',
      fileHint: 'PNG, JPEG, WebP, or SVG up to {maxSizeMB} MB',
      previewAlt: 'Receipt preview',
      uploading: 'Uploading...',
      forbidden: 'You do not have permission to upload receipts.',
      invalidFile: 'Select a valid receipt image.',
      unauthenticated: 'Sign in before uploading a receipt.',
      unsafeFile: 'The receipt did not pass the security check.',
      unsupportedType: 'Only PNG, JPEG, WebP, and SVG receipt images are supported.',
      tooLarge: 'The receipt image must not exceed {maxSizeMB} MB.',
      uploadFailed: 'The receipt could not be uploaded. Please try again.'
    },
    common: {
      notAvailable: '—',
      unassigned: 'Unassigned',
      generalOverhead: 'General Overhead',
      loading: 'Loading...',
      rowsPerPage: 'Rows per page:',
      of: 'of'
    },
    empty: {
      title: 'No expense records found',
      description: 'Log an expense or adjust the current search and filters.'
    },
    delete: {
      title: 'Delete expense record',
      description: 'Delete {name}? This financial record cannot be recovered.'
    },
    validation: {
      required: 'This field is required.',
      detailsTooLong: 'Expense details must not exceed 5,000 characters.',
      quantityInvalid: 'Enter a whole quantity greater than zero.',
      numberInvalid: 'Enter a valid non-negative number.',
      positiveInvalid: 'Enter a value greater than zero.',
      dateInvalid: 'Enter a valid expense date.',
      invalidRelation: 'One or more selected linked records are invalid.',
      invalidReceipt: 'The receipt path is invalid. Upload the receipt again.'
    },
    messages: {
      unauthenticated: 'Authentication is required.',
      forbidden: 'You do not have permission for this action.',
      loadFailed: 'Expense records could not be loaded.',
      optionsLoadFailed: 'Expense form options could not be loaded.',
      detailLoadFailed: 'Expense details could not be loaded.',
      notFound: 'Expense record was not found.',
      created: 'Expense record created successfully.',
      updated: 'Expense record updated successfully.',
      deleted: 'Expense record deleted successfully.',
      operationFailed: 'The expense operation could not be completed.'
    }
  }
}

translations.fa = translations.en
translations.ps = translations.en

export const getFinanceExpenseDictionary = locale => translations[locale] || translations.en
