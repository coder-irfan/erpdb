const translations = {
  en: {
    metrics: {
      totalIncome: 'Total Income',
      totalCollected: 'Total Collected',
      pendingReceivables: 'Pending Receivables',
      overdueReceivables: 'Overdue Receivables',
      baseCurrency: 'Reported in {currency}',
      collectedHint: 'Cash received to date',
      pendingHint: 'Outstanding balances',
      overdueHint: 'Past reminder date'
    },
    filters: {
      search: 'Search income',
      searchPlaceholder: 'Name, payment details, client, or project...',
      client: 'Client',
      project: 'Project',
      type: 'Income Type',
      status: 'Status',
      allClients: 'All clients',
      allProjects: 'All projects',
      allTypes: 'All income types',
      allStatuses: 'All statuses',
      clear: 'Clear filters'
    },
    table: {
      income: 'Income Name & Source',
      type: 'Type',
      amounts: 'Amounts & Currency',
      receiver: 'Receiver',
      reminder: 'Reminder Date',
      status: 'Status',
      actions: 'Actions',
      paid: 'Paid',
      due: 'Due'
    },
    actions: {
      add: 'Add Income',
      view: 'View Details',
      edit: 'Edit Income',
      printReceipt: 'Print Receipt',
      markPaid: 'Mark Fully Paid',
      delete: 'Delete Record',
      cancel: 'Cancel',
      create: 'Create Income',
      save: 'Save Changes',
      saving: 'Saving...',
      close: 'Close'
    },
    form: {
      addTitle: 'Add Income',
      editTitle: 'Edit Income',
      description: 'Record the source, linked records, and locked transaction values.',
      paymentPreview: 'Payment Summary',
      basePreview: 'Base amount ({currency})',
      usdPreview: 'USD equivalent',
      derivedStatus: 'Calculated status'
    },
    fields: {
      name: 'Income Name',
      client: 'Client',
      project: 'Project',
      contract: 'Contract',
      invoice: 'Invoice',
      incomeType: 'Income Type',
      totalAmount: 'Total Amount',
      paidAmount: 'Paid Amount',
      remainingAmount: 'Remaining Amount',
      currency: 'Currency',
      exchangeRate: 'USD / AFN Exchange Rate',
      receivedBy: 'Received By',
      paymentDetails: 'Payment Details',
      reminderDate: 'Reminder Date',
      baseAmount: 'Base Amount',
      totalUsd: 'USD Equivalent',
      status: 'Status'
    },
    placeholders: {
      client: 'No linked client',
      project: 'No linked project',
      contract: 'No linked contract',
      invoice: 'No linked invoice',
      incomeType: 'Select income type',
      receivedBy: 'Select receiving staff',
      paymentDetails: 'Payment method, reference, or internal note'
    },
    detail: {
      title: 'Income Details',
      financial: 'Financial Breakdown',
      linkedRecords: 'Linked Records',
      processing: 'Payment & Processing',
      client: 'Client',
      project: 'Project',
      contract: 'Contract',
      invoice: 'Invoice',
      receiver: 'Processing Officer',
      paymentDetails: 'Payment Details',
      exchangeRate: 'Locked Exchange Rate',
      createdAt: 'Created',
      updatedAt: 'Last Updated'
    },
    status: { PAID: 'Paid', PARTIAL: 'Partial', PENDING: 'Pending' },
    common: {
      notAvailable: '—',
      unassigned: 'Unassigned',
      overdue: 'Overdue',
      loading: 'Loading...',
      rowsPerPage: 'Rows per page:',
      of: 'of'
    },
    empty: {
      title: 'No income records found',
      description: 'Add an income record or adjust the current search and filters.'
    },
    delete: {
      title: 'Delete income record',
      description: 'Delete {name}? This financial record cannot be recovered.'
    },
    validation: {
      required: 'This field is required.',
      nameTooLong: 'Name must not exceed 191 characters.',
      numberInvalid: 'Enter a valid non-negative number.',
      positiveInvalid: 'Enter a value greater than zero.',
      dateInvalid: 'Enter a valid reminder date.',
      detailsTooLong: 'Payment details must not exceed 2,000 characters.',
      invalidRelation: 'One or more selected linked records are invalid or inconsistent.'
    },
    messages: {
      unauthenticated: 'Authentication is required.',
      forbidden: 'You do not have permission for this action.',
      loadFailed: 'Income records could not be loaded.',
      optionsLoadFailed: 'Income form options could not be loaded.',
      detailLoadFailed: 'Income details could not be loaded.',
      notFound: 'Income record was not found.',
      created: 'Income record created successfully.',
      updated: 'Income record updated successfully.',
      deleted: 'Income record deleted successfully.',
      markedPaid: 'Income marked as fully paid.',
      operationFailed: 'The income operation could not be completed.',
      invoiceInUse: 'The selected invoice is already linked to another income record.'
    }
  }
}

translations.fa = { ...translations.en, actions: { ...translations.en.actions, printReceipt: 'چاپ رسید' } }
translations.ps = { ...translations.en, actions: { ...translations.en.actions, printReceipt: 'رسید چاپول' } }

export const getFinanceIncomeDictionary = locale => translations[locale] || translations.en
