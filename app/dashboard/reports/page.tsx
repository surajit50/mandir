'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download, FileText, TrendingUp, TrendingDown, Building2, Wallet, BookOpen, BarChart3 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function ReportsPage() {
  const { data: session } = useSession()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedFY, setSelectedFY] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const { data: financialYears = [] } = useSWR('/api/financial-years', fetcher)

  // Fetch report data based on active tab
  const reportUrl = `/api/reports?type=${activeTab}${selectedFY ? `&financialYearId=${selectedFY}` : ''}${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`
  const { data: reportData, isLoading } = useSWR(
    session?.user?.role && ['ADMIN', 'ACCOUNTANT'].includes(session?.user?.role as string)
      ? reportUrl
      : null,
    fetcher
  )

  const handleExportCSV = () => {
    if (!reportData) return

    let csvRows: string[][] = []

    if (reportData.type === 'trial-balance') {
      csvRows = [
        ['Code', 'Name', 'Type', 'Opening', 'Debits', 'Credits', 'Dr Balance', 'Cr Balance'],
        ...reportData.data.map((r: any) => [
          r.accountCode, r.accountName, r.accountType,
          r.openingBalance, r.totalDebits, r.totalCredits,
          r.debitBalance, r.creditBalance,
        ]),
        ['TOTAL', '', '', '', '', '', reportData.totalDebitSide, reportData.totalCreditSide],
      ]
    } else if (reportData.type === 'income-expense') {
      csvRows = [
        ['Income Accounts'],
        ['Code', 'Name', 'Amount'],
        ...reportData.income.map((r: any) => [r.accountCode, r.accountName, r.amount]),
        ['Total Income', '', reportData.totalIncome],
        [],
        ['Expense Accounts'],
        ['Code', 'Name', 'Amount'],
        ...reportData.expense.map((r: any) => [r.accountCode, r.accountName, r.amount]),
        ['Total Expense', '', reportData.totalExpense],
        [],
        ['Net Surplus/Deficit', '', reportData.netSurplus],
      ]
    } else if (reportData.type === 'bank-summary') {
      csvRows = [
        ['Bank', 'Account No', 'Holder', 'Type', 'Opening', 'Credits', 'Debits', 'Current'],
        ...reportData.accounts.map((r: any) => [
          r.bankName, r.accountNumber, r.accountHolder, r.accountType,
          r.openingBalance, r.totalCredits, r.totalDebits, r.currentBalance,
        ]),
      ]
    } else if (reportData.type === 'cash-summary') {
      csvRows = [
        ['Date', 'Description', 'Receipts', 'Payments', 'Balance'],
        ['Opening Balance', '', '', '', reportData.openingBalance],
        ...reportData.entries.map((r: any) => [
          new Date(r.date).toLocaleDateString(), r.description,
          r.creditAmount, r.debitAmount, r.balance,
        ]),
        ['Closing Balance', '', reportData.totalReceipts, reportData.totalPayments, reportData.closingBalance],
      ]
    } else if (reportData.type === 'donation-summary') {
      csvRows = [
        ['Donation Summary Report'],
        ['Total Collections', reportData.totalCollections],
        ['Total Amount', reportData.totalAmount],
        ['Verified Amount', reportData.verifiedAmount],
        ['Pending Amount', reportData.pendingAmount],
        [],
        ['By Type'],
        ['Type', 'Count', 'Amount'],
        ...reportData.byType.map((r: any) => [r.type, r.count, r.amount]),
      ]
    } else {
      // Overview
      csvRows = [
        ['Overview Report'],
        ['Total Donations', reportData?.summary?.totalDonations || 0],
        ['Verified Donations', reportData?.summary?.totalVerified || 0],
        ['Total Payments', reportData?.summary?.totalPayments || 0],
        ['Total Receipts', reportData?.summary?.totalReceipts || 0],
        ['Bank Balance', reportData?.summary?.totalBankBalance || 0],
        ['Cash Balance', reportData?.summary?.cashBalance || 0],
      ]
    }

    const csvContent = "data:text/csv;charset=utf-8,"
      + csvRows.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `report_${reportData.type}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => window.print()

  // Format currency
  const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`

  return (
    <div className="space-y-6 print:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg text-white shadow-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Comprehensive financial reporting and analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <FileText className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={!reportData}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filter Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Financial Year</label>
              <Select value={selectedFY} onValueChange={setSelectedFY}>
                <SelectTrigger>
                  <SelectValue placeholder="All Financial Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Financial Years</SelectItem>
                  {financialYears.map((fy: any) => (
                    <SelectItem key={fy.id} value={fy.id}>
                      {fy.yearCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={() => {/* SWR auto-refreshes via URL change */}}>
                Apply Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="text-xs">
            <BarChart3 className="w-3 h-3 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="trial-balance" className="text-xs">
            <BookOpen className="w-3 h-3 mr-1" /> Trial Balance
          </TabsTrigger>
          <TabsTrigger value="income-expense" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" /> Income/Expense
          </TabsTrigger>
          <TabsTrigger value="bank-summary" className="text-xs">
            <Building2 className="w-3 h-3 mr-1" /> Bank Summary
          </TabsTrigger>
          <TabsTrigger value="cash-summary" className="text-xs">
            <Wallet className="w-3 h-3 mr-1" /> Cash Summary
          </TabsTrigger>
          <TabsTrigger value="donation-summary" className="text-xs">
            <TrendingDown className="w-3 h-3 mr-1" /> Donations
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading overview data...</CardContent></Card>
          ) : reportData?.type === 'overview' ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Card className="border-t-2 border-t-primary">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Total Donations</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.summary.totalDonations)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-emerald-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-emerald-600 uppercase">Verified</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.summary.totalVerified)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-amber-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-amber-600 uppercase">Pending</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.summary.totalPending)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-primary">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Total Receipts</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.summary.totalReceipts)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-rose-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-rose-600 uppercase">Total Payments</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.summary.totalPayments)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-blue-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-blue-600 uppercase">Bank Balance</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.summary.totalBankBalance)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-emerald-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-emerald-600 uppercase">Cash Balance</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.summary.cashBalance)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Trend</CardTitle>
                    <CardDescription>Donations, payments & receipts over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(v: any) => fmt(v)} />
                        <Legend />
                        <Bar dataKey="donations" fill="#3b82f6" name="Donations" />
                        <Bar dataKey="payments" fill="#ef4444" name="Payments" />
                        <Bar dataKey="receipts" fill="#10b981" name="Receipts" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Voucher Status</CardTitle>
                    <CardDescription>Approval workflow breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Draft', value: reportData.voucherByStatus.draft },
                            { name: 'Submitted', value: reportData.voucherByStatus.submitted },
                            { name: 'Approved', value: reportData.voucherByStatus.approved },
                            { name: 'Rejected', value: reportData.voucherByStatus.rejected },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {Array.from({ length: 4 }).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Donation Status</CardTitle>
                    <CardDescription>Collection verification status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Verified', value: reportData.donationByStatus.verified },
                            { name: 'Pending', value: reportData.donationByStatus.draft + reportData.donationByStatus.submitted },
                            { name: 'Rejected', value: reportData.donationByStatus.rejected },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {Array.from({ length: 3 }).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Net Cash Flow</CardTitle>
                    <CardDescription>Cash receipts vs payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[
                        {
                          category: 'Cash',
                          receipts: reportData.summary.cashBookReceipts,
                          payments: reportData.summary.cashBookPayments,
                        },
                        {
                          category: 'Bank',
                          credits: reportData.summary.totalBankBalance,
                        },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip formatter={(v: any) => fmt(v)} />
                        <Legend />
                        <Bar dataKey="receipts" fill="#10b981" name="Cash Receipts" />
                        <Bar dataKey="payments" fill="#ef4444" name="Cash Payments" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No data available</CardContent></Card>
          )}
        </TabsContent>

        {/* TRIAL BALANCE TAB */}
        <TabsContent value="trial-balance" className="space-y-6">
          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading trial balance...</CardContent></Card>
          ) : reportData?.type === 'trial-balance' ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-t-2 border-t-primary">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Total Debit Side</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.totalDebitSide)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-emerald-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-emerald-600 uppercase">Total Credit Side</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.totalCreditSide)}</p>
                  </CardContent>
                </Card>
                <Card className={`border-t-2 ${reportData.isBalanced ? 'border-t-emerald-500' : 'border-t-rose-500'}`}>
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold uppercase">
                      {reportData.isBalanced ? 'Balanced ✓' : 'Imbalanced ✗'}
                    </p>
                    <p className="text-xl font-black mt-1">
                      {reportData.isBalanced ? '0.00' : fmt(Math.abs(reportData.totalDebitSide - reportData.totalCreditSide))}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="py-3 px-4 text-left font-bold">Code</th>
                          <th className="py-3 px-4 text-left font-bold">Account Name</th>
                          <th className="py-3 px-4 text-left font-bold">Type</th>
                          <th className="py-3 px-4 text-right font-bold">Opening Bal</th>
                          <th className="py-3 px-4 text-right font-bold">Total Debits</th>
                          <th className="py-3 px-4 text-right font-bold">Total Credits</th>
                          <th className="py-3 px-4 text-right font-bold">Debit Balance</th>
                          <th className="py-3 px-4 text-right font-bold">Credit Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.data.map((row: any, idx: number) => (
                          <tr key={row.accountCode} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="py-2 px-4 font-mono text-xs font-bold text-primary">{row.accountCode}</td>
                            <td className="py-2 px-4 font-semibold">{row.accountName}</td>
                            <td className="py-2 px-4 text-xs">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                row.accountType === 'Asset' ? 'bg-blue-100 text-blue-700' :
                                row.accountType === 'Expense' ? 'bg-rose-100 text-rose-700' :
                                row.accountType === 'Income' ? 'bg-emerald-100 text-emerald-700' :
                                row.accountType === 'Liability' ? 'bg-amber-100 text-amber-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>{row.accountType}</span>
                            </td>
                            <td className="py-2 px-4 text-right">{fmt(row.openingBalance)}</td>
                            <td className="py-2 px-4 text-right">{fmt(row.totalDebits)}</td>
                            <td className="py-2 px-4 text-right">{fmt(row.totalCredits)}</td>
                            <td className="py-2 px-4 text-right font-bold text-primary">{row.debitBalance > 0 ? fmt(row.debitBalance) : '—'}</td>
                            <td className="py-2 px-4 text-right font-bold text-emerald-600">{row.creditBalance > 0 ? fmt(row.creditBalance) : '—'}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-900 text-white font-black">
                          <td className="py-3 px-4" colSpan={3}>TOTAL</td>
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4 text-right">{fmt(reportData.totalDebitSide)}</td>
                          <td className="py-3 px-4 text-right">{fmt(reportData.totalCreditSide)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No data available. Ensure GL accounts are set up.</CardContent></Card>
          )}
        </TabsContent>

        {/* INCOME/EXPENSE TAB */}
        <TabsContent value="income-expense" className="space-y-6">
          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading income & expense data...</CardContent></Card>
          ) : reportData?.type === 'income-expense' ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-t-2 border-t-emerald-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-emerald-600 uppercase">Total Income</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.totalIncome)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-rose-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-rose-600 uppercase">Total Expense</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.totalExpense)}</p>
                  </CardContent>
                </Card>
                <Card className={`border-t-2 ${reportData.netSurplus >= 0 ? 'border-t-emerald-500' : 'border-t-rose-500'}`}>
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold uppercase">
                      {reportData.netSurplus >= 0 ? 'Net Surplus' : 'Net Deficit'}
                    </p>
                    <p className={`text-xl font-black mt-1 ${reportData.netSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {fmt(reportData.netSurplus)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-emerald-600">Income Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={reportData.income.filter((r: any) => r.amount > 0)}
                          cx="50%" cy="50%"
                          labelLine={false}
                          label={({ accountName, amount }: any) => `${accountName}: ${fmt(amount)}`}
                          outerRadius={80}
                          dataKey="amount"
                          nameKey="accountName"
                        >
                          {reportData.income.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-rose-600">Expense Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={reportData.expense.filter((r: any) => r.amount > 0)}
                          cx="50%" cy="50%"
                          labelLine={false}
                          label={({ accountName, amount }: any) => `${accountName}: ${fmt(amount)}`}
                          outerRadius={80}
                          dataKey="amount"
                          nameKey="accountName"
                        >
                          {reportData.expense.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Income Accounts Detail</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-emerald-50 border-b"><th className="py-2 px-4 text-left">Code</th><th className="py-2 px-4 text-left">Name</th><th className="py-2 px-4 text-right">Amount</th></tr></thead>
                      <tbody>
                        {reportData.income.map((r: any) => (
                          <tr key={r.accountCode} className="border-b border-slate-50"><td className="py-2 px-4 font-mono text-xs">{r.accountCode}</td><td className="py-2 px-4">{r.accountName}</td><td className="py-2 px-4 text-right font-bold text-emerald-600">{fmt(r.amount)}</td></tr>
                        ))}
                        <tr className="bg-emerald-50 font-bold"><td colSpan={2} className="py-2 px-4">Total Income</td><td className="py-2 px-4 text-right">{fmt(reportData.totalIncome)}</td></tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Expense Accounts Detail</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-rose-50 border-b"><th className="py-2 px-4 text-left">Code</th><th className="py-2 px-4 text-left">Name</th><th className="py-2 px-4 text-right">Amount</th></tr></thead>
                      <tbody>
                        {reportData.expense.map((r: any) => (
                          <tr key={r.accountCode} className="border-b border-slate-50"><td className="py-2 px-4 font-mono text-xs">{r.accountCode}</td><td className="py-2 px-4">{r.accountName}</td><td className="py-2 px-4 text-right font-bold text-rose-600">{fmt(r.amount)}</td></tr>
                        ))}
                        <tr className="bg-rose-50 font-bold"><td colSpan={2} className="py-2 px-4">Total Expense</td><td className="py-2 px-4 text-right">{fmt(reportData.totalExpense)}</td></tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No data available. Ensure GL accounts with Income/Expense types are created.</CardContent></Card>
          )}
        </TabsContent>

        {/* BANK SUMMARY TAB */}
        <TabsContent value="bank-summary" className="space-y-6">
          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading bank data...</CardContent></Card>
          ) : reportData?.type === 'bank-summary' ? (
            <>
              <Card className="border-t-2 border-t-blue-500">
                <CardContent className="pt-4">
                  <p className="text-xs font-bold text-blue-600 uppercase">Total Bank Balance (All Accounts)</p>
                  <p className="text-2xl font-black mt-1">{fmt(reportData.totalBankBalance)}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reportData.accounts.map((acc: any) => (
                  <Card key={acc.id} className="border-t-2 border-t-blue-400">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{acc.bankName}</CardTitle>
                      <CardDescription>{acc.accountNumber} — {acc.accountHolder}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-xs text-muted-foreground">Account Type</p><p className="font-bold">{acc.accountType}</p></div>
                        <div><p className="text-xs text-muted-foreground">Opening Balance</p><p className="font-bold">{fmt(acc.openingBalance)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Total Credits</p><p className="font-bold text-emerald-600">{fmt(acc.totalCredits)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Total Debits</p><p className="font-bold text-rose-600">{fmt(acc.totalDebits)}</p></div>
                        <div className="col-span-2 border-t pt-2"><p className="text-xs text-muted-foreground">Current Balance</p><p className="text-lg font-black text-blue-600">{fmt(acc.currentBalance)}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader><CardTitle>Bank Balance Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.accounts.map((a: any) => ({
                          name: `${a.bankName} (${a.accountNumber})`,
                          value: a.currentBalance,
                        }))}
                        cx="50%" cy="50%"
                        labelLine={false}
                        label={({ name, value }: any) => `${name}: ${fmt(value)}`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {reportData.accounts.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No bank accounts found. Create bank accounts first.</CardContent></Card>
          )}
        </TabsContent>

        {/* CASH SUMMARY TAB */}
        <TabsContent value="cash-summary" className="space-y-6">
          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading cash data...</CardContent></Card>
          ) : reportData?.type === 'cash-summary' ? (
            <>
              <div className="grid grid-cols-4 gap-4">
                <Card className="border-t-2 border-t-slate-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Opening Balance</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.openingBalance)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-emerald-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-emerald-600 uppercase">Total Receipts</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.totalReceipts)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-rose-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-rose-600 uppercase">Total Payments</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.totalPayments)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-primary">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-primary uppercase">Closing Balance</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.closingBalance)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Cash Flow Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reportData.entries.slice(-20)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString()} />
                      <YAxis />
                      <Tooltip formatter={(v: any) => fmt(v)} labelFormatter={(d: any) => new Date(d).toLocaleDateString()} />
                      <Legend />
                      <Line type="monotone" dataKey="creditAmount" stroke="#10b981" name="Receipts" />
                      <Line type="monotone" dataKey="debitAmount" stroke="#ef4444" name="Payments" />
                      <Line type="monotone" dataKey="balance" stroke="#3b82f6" name="Balance" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="py-3 px-4 text-left">Date</th>
                          <th className="py-3 px-4 text-left">Description</th>
                          <th className="py-3 px-4 text-left">Ref Type</th>
                          <th className="py-3 px-4 text-right">Receipts</th>
                          <th className="py-3 px-4 text-right">Payments</th>
                          <th className="py-3 px-4 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-slate-50 italic"><td className="py-2 px-4">—</td><td className="py-2 px-4 font-semibold">Opening Balance b/f</td><td className="py-2 px-4">—</td><td className="py-2 px-4">—</td><td className="py-2 px-4">—</td><td className="py-2 px-4 text-right font-bold">{fmt(reportData.openingBalance)}</td></tr>
                        {reportData.entries.map((e: any, idx: number) => (
                          <tr key={e.id} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                            <td className="py-2 px-4">{new Date(e.date).toLocaleDateString()}</td>
                            <td className="py-2 px-4">{e.description}</td>
                            <td className="py-2 px-4 text-xs"><span className="px-2 py-0.5 rounded bg-slate-100">{e.referenceType}</span></td>
                            <td className="py-2 px-4 text-right font-bold text-emerald-600">{e.creditAmount > 0 ? fmt(e.creditAmount) : '—'}</td>
                            <td className="py-2 px-4 text-right font-bold text-rose-600">{e.debitAmount > 0 ? fmt(e.debitAmount) : '—'}</td>
                            <td className="py-2 px-4 text-right font-bold">{fmt(e.balance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-900 text-white font-black"><td colSpan={3} className="py-3 px-4">CLOSING BALANCE</td><td className="py-3 px-4 text-right">{fmt(reportData.totalReceipts)}</td><td className="py-3 px-4 text-right">{fmt(reportData.totalPayments)}</td><td className="py-3 px-4 text-right">{fmt(reportData.closingBalance)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No cash book entries found.</CardContent></Card>
          )}
        </TabsContent>

        {/* DONATION SUMMARY TAB */}
        <TabsContent value="donation-summary" className="space-y-6">
          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading donation data...</CardContent></Card>
          ) : reportData?.type === 'donation-summary' ? (
            <>
              <div className="grid grid-cols-4 gap-4">
                <Card className="border-t-2 border-t-primary">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Total Collections</p>
                    <p className="text-xl font-black mt-1">{reportData.totalCollections}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-emerald-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-emerald-600 uppercase">Verified Amount</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.verifiedAmount)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-amber-500">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-amber-600 uppercase">Pending Amount</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.pendingAmount)}</p>
                  </CardContent>
                </Card>
                <Card className="border-t-2 border-t-primary">
                  <CardContent className="pt-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Total Amount</p>
                    <p className="text-xl font-black mt-1">{fmt(reportData.totalAmount)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>By Donation Type</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={reportData.byType.filter((r: any) => r.amount > 0)}
                          cx="50%" cy="50%"
                          labelLine={false}
                          label={({ type, amount }: any) => `${type}: ${fmt(amount)}`}
                          outerRadius={80}
                          dataKey="amount"
                          nameKey="type"
                        >
                          {reportData.byType.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Monthly Donation Trend</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData.byMonth.slice(-12)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(v: any) => fmt(v)} />
                        <Bar dataKey="amount" fill="#3b82f6" name="Donations" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle>By Collector</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-900 text-white"><th className="py-2 px-4 text-left">Collector</th><th className="py-2 px-4 text-right">Count</th><th className="py-2 px-4 text-right">Total Amount</th></tr></thead>
                    <tbody>
                      {reportData.byCollector.map((r: any) => (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50"><td className="py-2 px-4 font-semibold">{r.name}</td><td className="py-2 px-4 text-right">{r.count}</td><td className="py-2 px-4 text-right font-bold">{fmt(r.amount)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No donation data found.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}