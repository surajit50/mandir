'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Plus, ExternalLink } from 'lucide-react';

interface GLAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  currentBalance: number;
  totalDebits: number;
  totalCredits: number;
}

export default function GLAccountsPage() {
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, [filter]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const query = filter ? `?accountType=${filter}` : '';
      const res = await fetch(`/api/gl-accounts${query}`);
      
      if (!res.ok) throw new Error('Failed to fetch accounts');
      
      const data = await res.json();
      setAccounts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching accounts');
    } finally {
      setLoading(false);
    }
  };

  const accountTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">General Ledger Accounts</h1>
          <p className="text-gray-600 mt-1">Manage chart of accounts</p>
        </div>
        <Link href="/dashboard/gl-accounts/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Account
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === '' ? 'default' : 'outline'}
              onClick={() => setFilter('')}
            >
              All Accounts
            </Button>
            {accountTypes.map((type) => (
              <Button
                key={type}
                variant={filter === type ? 'default' : 'outline'}
                onClick={() => setFilter(type)}
              >
                {type}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p>Loading accounts...</p>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600">No GL accounts found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Code</th>
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Type</th>
                      <th className="text-right py-3 px-4 font-semibold">Opening Balance</th>
                      <th className="text-right py-3 px-4 font-semibold">Debits</th>
                      <th className="text-right py-3 px-4 font-semibold">Credits</th>
                      <th className="text-right py-3 px-4 font-semibold">Current Balance</th>
                      <th className="text-center py-3 px-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm">{account.accountCode}</td>
                        <td className="py-3 px-4">{account.accountName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {account.accountType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {account.openingBalance.toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600">
                          {account.totalDebits.toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600">
                          {account.totalCredits.toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {account.currentBalance.toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                          })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link href={`/dashboard/gl-accounts/${account.id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
