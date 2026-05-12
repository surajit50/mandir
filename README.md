# Temple Trust Management System

A comprehensive web-based accounting and donation management system for temple trusts, built with Next.js 16, MongoDB, and TypeScript.

## Features

### Core Modules

1. **Donation Collection** - Manage and track donations from members with verification workflow
2. **Cash Management** - Member cash ledger tracking debits, credits, and balances
3. **Cash Handover** - Process and approve cash handovers between members
4. **Payment Vouchers** - Create and manage payment vouchers with approval workflow
5. **Bank Accounts** - Manage multiple bank accounts and track balances
6. **Bank Reconciliation** - Monthly reconciliation between bank and book balances
7. **Cheque Register** - Track issued, cleared, and bounced cheques
8. **Bank Deposits** - Record and verify bank deposits
9. **Reports & Analytics** - Comprehensive financial reports and dashboards
10. **User Management** - Role-based access control with 3 user types

### User Roles

- **Admin**: Full system access, user management, system configuration
- **Accountant**: Financial operations, approvals, verification
- **Member**: View personal cash ledger and donation history

### Key Features

- Secure authentication with JWT and password hashing
- Role-based access control and authorization
- Automatic cash book entries from verified transactions
- Approval workflows for donations and vouchers
- Financial analytics with Recharts charts
- Responsive UI with Tailwind CSS
- Real-time data with SWR client-side caching
- Comprehensive API endpoints with validation

## Technology Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **Validation**: Zod schema validation
- **Charts**: Recharts for data visualization
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance
- npm/yarn/pnpm package manager

### Installation

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables in `.env`:
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/temple-trust"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
```

4. Generate Prisma client:
```bash
pnpm exec prisma generate
```

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
/app
  /api                    # API routes
    /auth                # Authentication endpoints
    /donations           # Donation management
    /cash-handovers      # Cash handover operations
    /vouchers            # Payment vouchers
    /bank-accounts       # Bank account management
    /bank-reconciliation # Reconciliation
    /cheques             # Cheque register
    /bank-deposits       # Deposit management
  /auth                  # Authentication pages
  /dashboard            # Main application
    /donations          # Donation collection
    /cash-ledger        # Cash ledger view
    /cash-handovers     # Cash handover management
    /vouchers           # Voucher management
    /bank-accounts      # Bank accounts
    /bank-reconciliation# Reconciliation
    /cheques            # Cheque register
    /bank-deposits      # Bank deposits
    /reports            # Financial reports
    /members            # User management
    /settings           # System settings

/components
  /dashboard            # Shared dashboard components
  /ui                   # shadcn/ui components

/lib
  /auth.ts             # NextAuth configuration
  /prisma.ts           # Prisma client utility
  /password.ts         # Password utilities

/prisma
  /schema.prisma       # Database schema
```

## Database Schema

### User Model
- User authentication and role management
- Supports ADMIN, ACCOUNTANT, and MEMBER roles

### Donation Collection
- DonationCollection: Main collection records
- DonationItem: Individual donations within a collection
- CashBook: Automatic entries from verified donations

### Cash Management
- MemberCashLedger: Transaction history for members
- CashHandover: Cash transfers between members
- CashDeliveryNote: Handover confirmations

### Financial Operations
- PaymentVoucher: Payment authorization
- CashBook: Complete cash transaction log
- BankAccount: Bank account management
- BankDeposit: Bank deposit records

### Reconciliation
- BankReconciliation: Monthly reconciliation records
- BankReconciliationItem: Individual reconciliation items
- ChequeRegister: Issued cheques tracking

## API Endpoints

### Donations
- `GET /api/donations` - List all donations
- `POST /api/donations` - Create new donation
- `GET /api/donations/[id]` - Get donation details
- `POST /api/donations/[id]/verify` - Verify donation

### Cash Handovers
- `GET /api/cash-handovers` - List handovers
- `POST /api/cash-handovers` - Create handover
- `POST /api/cash-handovers/[id]/approve` - Approve handover

### Vouchers
- `GET /api/vouchers` - List vouchers
- `POST /api/vouchers` - Create voucher
- `POST /api/vouchers/[id]/approve` - Approve voucher

### Bank Operations
- `GET /api/bank-accounts` - List accounts
- `POST /api/bank-accounts` - Create account
- `GET /api/bank-reconciliation` - List reconciliations
- `POST /api/bank-reconciliation` - Create reconciliation
- `GET /api/cheques` - List cheques
- `POST /api/cheques` - Record cheque

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT-based session management
- Role-based access control
- Protected API routes with session validation
- Input validation with Zod
- Secure cookie-based sessions

## Business Rules

1. **Donations**: Cannot have negative amounts, must be verified before cash book entry
2. **Cash Handovers**: Must be approved by accountant/admin
3. **Payment Vouchers**: Only affect cash book after admin approval
4. **Cash Ledger**: Prevents negative balances
5. **Bank Reconciliation**: Monthly reconciliation between bank and book balances

## Development

### Running Tests
```bash
pnpm test
```

### Building for Production
```bash
pnpm build
pnpm start
```

### Prisma Commands
```bash
pnpm exec prisma studio      # Open Prisma Studio
pnpm exec prisma migrate dev # Create migration
```

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`

3. Deploy:
```bash
pnpm build
```

## Future Enhancements

- Email notifications for approvals
- PDF report generation
- Advanced search and filtering
- Bulk operations
- Audit logging
- Two-factor authentication
- API documentation (Swagger)
- Mobile application

## Support

For issues or feature requests, please create an issue in the repository.

## License

This project is proprietary and confidential.

## Changelog

### Version 1.0.0
- Initial release with all 10 core modules
- Authentication and user management
- Financial operations and reconciliation
- Reports and analytics dashboards
