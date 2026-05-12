# Bank Passbook & Cash Book - Detailed Implementation Guide

## Overview

Two comprehensive financial ledger modules have been added to the Temple Trust Management System to provide detailed transaction visibility and reporting capabilities.

## 1. Bank Passbook Module

### Features

**Location:** `/dashboard/bank-passbook`

**What it does:**
- Display detailed bank account transaction history in passbook format
- Filter transactions by date range and account
- Calculate opening balance, total deposits, total withdrawals, and closing balance
- Print-friendly interface for generating physical passbooks
- Real-time balance calculation with running balances

**Key Features:**
- **Multi-Account Support:** Select from any configured bank account
- **Date Filtering:** Custom date ranges for transaction queries
- **Detailed Transactions:** Shows:
  - Transaction date
  - Description/particulars
  - Cheque number or reference type
  - Deposits (credits)
  - Withdrawals (debits)
  - Running balance after each transaction
- **Summary Cards:** Opening balance, total deposits, total withdrawals, closing balance
- **Passbook Table:** Professional layout matching standard bank passbook format
- **Print Functionality:** Print-optimized CSS for generating physical copies

### Data Sources

The Bank Passbook aggregates transactions from:
- **Bank Deposits:** Deposits made to the account
- **Cheque Register:** Cleared cheques (withdrawals)

**Running Balance Calculation:**
```
Opening Balance + Deposits - Withdrawals = Running Balance
```

### API Endpoint

**GET** `/api/bank-accounts/[id]/passbook`

**Parameters:**
```
startDate: YYYY-MM-DD (optional)
endDate: YYYY-MM-DD (optional)
```

**Response:**
```json
[
  {
    "id": "string",
    "date": "ISO datetime",
    "description": "string",
    "chequeNumber": "string (optional)",
    "debitAmount": "number",
    "creditAmount": "number",
    "balance": "number (running balance)",
    "referenceType": "string"
  }
]
```

### Use Cases

1. **Reconciliation:** Verify account activity with bank statements
2. **Audit Trail:** Complete transaction history for compliance
3. **Financial Reports:** Extract transactions for period statements
4. **Customer Service:** Provide account statements to stakeholders

---

## 2. Cash Book Module

### Features

**Location:** `/dashboard/cash-book`

**What it does:**
- Display comprehensive cash ledger with GL posting details
- Track all cash inflows and outflows with running balances
- Filter by date range and transaction type
- Export data to CSV for external analysis
- Print-friendly format for archival

**Key Features:**
- **Summary Statistics:**
  - Opening balance
  - Total receipts (inflows)
  - Total payments (outflows)
  - Closing balance
  - Net cash flow
  
- **Advanced Filtering:**
  - Date range selection
  - Transaction type filter (DonationCollection, PaymentVoucher, etc.)
  
- **Detailed Transaction Table:**
  - Date of transaction
  - Particulars/description
  - Reference type
  - Receipts amount (deposits)
  - Payments amount (withdrawals)
  - Running balance
  
- **Professional Formatting:**
  - Opening balance row
  - Individual transaction rows with alternating background
  - Total row with summaries
  - Closing balance row
  - Summary statistics section

- **Export Options:**
  - Print to PDF via browser
  - Export to CSV for Excel/spreadsheet analysis

### Transaction Types Tracked

- `DonationCollection` - Donations received
- `PaymentVoucher` - Authorized payments
- `CashHandover` - Cash transfers
- `BankDeposit` - Bank deposits
- `ChequeCleared` - Cheque clearances
- And any other cash book entries

### API Endpoint

**GET** `/api/cash-book`

**Response:**
```json
[
  {
    "id": "string",
    "date": "ISO datetime",
    "description": "string",
    "debitAmount": "number",
    "creditAmount": "number",
    "balance": "number (running balance)",
    "referenceType": "string",
    "referenceId": "string (optional)"
  }
]
```

### Use Cases

1. **Daily Cash Management:** Monitor daily cash position
2. **Financial Statements:** Prepare cash flow statements
3. **Audit Compliance:** Complete transaction ledger for auditors
4. **Analysis:** Identify cash patterns and trends
5. **Reconciliation:** Match cash book with GL accounts

---

## 3. Comparison: Cash Book vs Bank Passbook

| Aspect | Cash Book | Bank Passbook |
|--------|-----------|---------------|
| **Scope** | All cash transactions | Bank account transactions only |
| **Source** | All modules | Bank deposits & cheques |
| **Balance Type** | Running cash balance | Running bank balance |
| **Use** | Internal accounting | Bank reconciliation |
| **Detail Level** | GL posting level | Transaction level |

---

## 4. Balance Calculation Logic

### Opening Balance
```
First transaction balance - (First transaction debit - First transaction credit)
```

### Running Balance (For Each Transaction)
```
Previous Balance + Current Credit - Current Debit
```

### Closing Balance
```
Last transaction balance
```

---

## 5. UI/UX Features

### Bank Passbook Page
- Account selector dropdown
- Date range inputs
- Summary cards showing:
  - Opening balance (slate)
  - Total deposits (green)
  - Total withdrawals (red)
  - Closing balance (blue)
- Professional table with:
  - Alternating row colors
  - Hover effects
  - Aligned numeric columns
  - Summary footer
- Print button (top-right)

### Cash Book Page
- Date range inputs
- Transaction type filter dropdown
- Summary cards with:
  - Icons for quick identification
  - Color-coded (green for receipts, red for payments)
  - Clear labeling
- Detailed table with:
  - Standard accounting format
  - Opening balance row
  - Transaction details
  - Total summary row
  - Closing balance row
  - Bottom summary statistics
- Print and Export buttons

---

## 6. Sidebar Navigation

Both modules are accessible from the main sidebar:

```
Accounting
├── Cash Ledger
├── Cash Book ← NEW
├── Cash Handovers
├── Bank Accounts
├── Bank Passbook ← NEW
├── Bank Reconciliation
└── Cheque Register
```

---

## 7. Print and Export Functionality

### Print Feature
- Uses browser's print dialog
- CSS optimized for printing
- Removes unnecessary UI elements
- Adjusts colors for better print quality
- Maintains proper table formatting

### Export Feature (Cash Book Only)
- Exports to CSV format
- Includes column headers
- Includes summary rows
- Ready for Excel/Google Sheets import
- Filename includes date: `cash-book-YYYY-MM-DD.csv`

---

## 8. Data Integrity

### Running Balance Accuracy
- Calculated from opening balance + cumulative transactions
- Verified against source transactions
- Real-time calculation on frontend
- Can be reconciled against GL accounts

### Historical Data
- All past transactions remain accessible
- No data deletion or modification on viewing
- Complete audit trail maintained

---

## 9. Future Enhancements

Potential additions for future versions:
1. **GL Reconciliation:** Auto-match GL accounts with cash book entries
2. **Bank Reconciliation Widget:** Built-in reconciliation checks
3. **Monthly Closing:** Automated monthly cash book closing
4. **Advanced Reports:** Cash flow analysis, fund flow statements
5. **Email Export:** Direct email passbook/cash book via scheduled reports
6. **Multi-Period Comparison:** Compare periods side-by-side
7. **Budget vs Actual:** Compare actual cash flows with budgets

---

## 10. Support & Troubleshooting

### Common Issues

**Q: Running balance doesn't match bank statement?**
- A: Check date range filters. Ensure all transactions are included.

**Q: CSV export has incorrect formatting?**
- A: Use 'Comma' delimiter in Excel. May need to adjust regional settings.

**Q: Print preview shows incorrect formatting?**
- A: Use Chrome/Chromium for best print results. Check print margins.

### Accessing the Features

**Bank Passbook:**
1. Click "Bank Passbook" in sidebar
2. Select bank account
3. Choose date range
4. Click "View Passbook"

**Cash Book:**
1. Click "Cash Book" in sidebar
2. Optionally filter by date and type
3. View, print, or export

---

## 11. Security & Access Control

Both modules follow role-based access:
- **Admin:** Full access to all data
- **Accountant:** Full access to all data
- **Member:** No access (hidden from sidebar)

Access is enforced at both:
- Frontend (UI visibility)
- Backend (API authentication)
