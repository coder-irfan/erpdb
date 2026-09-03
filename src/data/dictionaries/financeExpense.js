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
      actions: 'Actions',
      status: 'Approval Status'
    },
    actions: {
      add: 'Log Expense',
      view: 'View Details',
      edit: 'Edit Expense',
      printVoucher: 'Print Voucher',
      delete: 'Delete Record',
      cancel: 'Cancel',
      create: 'Create Expense',
      save: 'Save Changes',
      saving: 'Saving...',
      close: 'Close',
      download: 'Download Receipt',
      approve: 'Approve Expense',
      reject: 'Reject',
      markPaid: 'Mark as Paid'
    },
    form: {
      addTitle: 'Log Expense',
      editTitle: 'Edit Expense',
      description: 'Record the expense scope, receipt, and locked transaction values.',
      calculation: 'Live Calculation',
      subtotalPreview: 'Transaction subtotal',
      basePreview: 'Base amount ({currency})',
      usdPreview: 'USD equivalent',
      statusManagedHint: 'New and revised expenses enter Pending Approval.'
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
      receipt: 'Receipt Attachment',
      vendorPayee: 'Vendor / Payee',
      approvalStatus: 'Approval Status',
      voucherNumber: 'Voucher Number',
      approvedBy: 'Approved By',
      processedBy: 'Processing Officer',
      paidAt: 'Paid Date',
      rejectionReason: 'Rejection Reason'
    },
    placeholders: {
      details: 'Describe what was purchased or paid for',
      expenseType: 'Select expense type',
      project: 'General overhead / no project',
      spentBy: 'No assigned staff',
      paymentMethod: 'No payment method selected',
      vendorPayee: 'Google Ads, Building Landlord, Kabul Electric...'
    },
    detail: {
      title: 'Expense Details',
      overviewTab: 'Overview & Financials',
      auditTab: 'Audit & Approvals',
      financial: 'Financial Breakdown',
      context: 'Expense Context',
      project: 'Linked Project',
      staff: 'Spent By',
      receipt: 'Receipt Preview',
      exchangeRate: 'Locked Exchange Rate',
      createdAt: 'Created',
      updatedAt: 'Last Updated',
      approval: 'Approval & Disbursement',
      systemTimestamps: 'System Timestamps'
    },
    upload: {
      upload: 'Upload',
      replace: 'Replace',
      remove: 'Remove',
      fileHint: 'PNG, JPEG, WebP, or SVG up to {maxSizeMB} MB',
      drop: 'Drag and drop a receipt image or PDF here.',
      previewAlt: 'Receipt preview',
      uploading: 'Uploading...',
      forbidden: 'You do not have permission to upload receipts.',
      invalidFile: 'Select a valid receipt image.',
      unauthenticated: 'Sign in before uploading a receipt.',
      unsafeFile: 'The receipt did not pass the security check.',
      unsupportedType: 'Only PNG, JPEG, WebP, and PDF receipts are supported.',
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
      invalidReceipt: 'The receipt path is invalid. Upload the receipt again.',
      vendorTooLong: 'Vendor / Payee must not exceed 191 characters.'
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
      operationFailed: 'The expense operation could not be completed.',
      approved: 'Expense approved successfully.',
      rejected: 'Expense rejected successfully.',
      paid: 'Expense marked as paid and posted to the general ledger.',
      locked: 'Approved and paid expenses cannot be edited or deleted.',
      invalidTransition: 'This expense cannot move to the requested status.',
      approvalForbidden: 'Only a Finance Director or the linked Project Manager may approve this expense.'
    },
    status: {
      DRAFT: 'Draft',
      PENDING_APPROVAL: 'Pending Approval',
      APPROVED: 'Approved',
      PAID: 'Paid',
      REJECTED: 'Rejected'
    },
    workflow: {
      approveTitle: 'Approve Expense',
      rejectTitle: 'Reject Expense',
      payTitle: 'Execute Disbursement',
      approveDescription: 'Confirm that this expense has been reviewed and is ready for payment.',
      approveConfirmation: 'Are you sure you want to approve {voucher}?',
      rejectConfirmation: 'Are you sure you want to reject {voucher}?'
    }
  }
}

translations.fa = { ...translations.en, actions: { ...translations.en.actions, printVoucher: 'چاپ سند پرداخت' } }
translations.ps = { ...translations.en, actions: { ...translations.en.actions, printVoucher: 'د تادیې سند چاپول' } }

export const getFinanceExpenseDictionary = locale => translations[locale] || translations.en
