'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download, FileText } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ReportsPage() {
  const { data: session } = useSession()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: donations = [] } = useSWR('/api/donations', fetcher)
  const { data: vouchers = [] } = useSWR('/api/vouchers', fetcher)
  const { data: cashBook = [] } = useSWR('/api/cash-book', fetcher)

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

  // Calculate donation statistics
  const donationStats = {
    total: donations.reduce((sum: number, d: any) => sum + (d.totalAmount || 0), 0),
    verified: donations.filter((d: any) => d.isVerified).length,
    pending: donations.filter((d: any) => !d.isVerified).length,
  }

  // Calculate voucher statistics
  const voucherStats = {
    total: vouchers.reduce((sum: number, v: any) => sum + (v.amount || 0), 0),
    approved: vouchers.filter((v: any) => v.status === 'APPROVED').length,
    pending: vouchers.filter((v: any) => v.status === 'DRAFT' || v.status === 'SUBMITTED').length,
  }

  // Prepare chart data
  const donationsByDate = donations.reduce((acc: any[], d: any) => {
    const date = new Date(d.collectionDate).toLocaleDateString()
    const existing = acc.find(item => item.date === date)
    if (existing) {
      existing.amount += d.totalAmount
      existing.count += 1
    } else {
      acc.push({ date, amount: d.totalAmount, count: 1 })
    }
    return acc
  }, []).slice(-7)

  const donationsByType = donations.reduce((acc: any[], d: any) => {
    return acc // Simplified for now
  }, [])

  const cashFlow = cashBook.slice(-10).map((entry: any) => ({
    date: new Date(entry.date).toLocaleDateString(),
    debit: entry.debitAmount,
    credit: entry.creditAmount,
    balance: entry.balance,
  }))

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    alert('PDF export functionality coming soon')
  }

  const handleExportCSV = () => {
    const data = [
      ['Date', 'Donor Name', 'Amount', 'Type'],
      ...donations.map((d: any) => [
        new Date(d.collectionDate).toLocaleDateString(),
        d.donorName || 'N/A',
        d.totalAmount,
        'Donation'
      ])
    ]
    const csvContent = "data:text/csv;charset=utf-8," 
      + data.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `report_${new Date().toISOString()}.csv`)
    document.body.appendChild(link)
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">View comprehensive reports and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => {
              // Filter logic will be added here
            }}>
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{donationStats.total.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">{donations.length} collections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{donationStats.verified}</div>
            <p className="text-xs text-gray-500 mt-1">Completed collections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Vouchers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{voucherStats.total.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">{vouchers.length} vouchers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{donationStats.pending + voucherStats.pending}</div>
            <p className="text-xs text-gray-500 mt-1">Items awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donations Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Donations Trend</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={donationsByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" name="Amount" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cash Flow Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
            <CardDescription>Debit vs Credit</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="debit" fill="#3b82f6" name="Debit" />
                <Bar dataKey="credit" fill="#10b981" name="Credit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donation Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Donation Status</CardTitle>
            <CardDescription>Collection status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Verified', value: donationStats.verified },
                    { name: 'Pending', value: donationStats.pending },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[0, 1].map((index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Voucher Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Voucher Status</CardTitle>
            <CardDescription>Payment voucher breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Approved', value: voucherStats.approved },
                    { name: 'Pending', value: voucherStats.pending },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[0, 1].map((index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index + 2]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
