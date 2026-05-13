'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Plus, Calendar } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Festival {
  id: string;
  festivalName: string;
  festivalDate: string;
  budgetAmount: number;
  totalIncome: number;
  totalExpense: number;
  surplus: number;
}

export default function FestivalsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFestivals();
  }, []);

  const fetchFestivals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/festivals');
      
      if (!res.ok) throw new Error('Failed to fetch festivals');
      
      const data = await res.json();
      setFestivals(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching festivals');
    } finally {
      setLoading(false);
    }
  };

  const totalBudget = festivals.reduce((sum, f) => sum + f.budgetAmount, 0);
  const totalIncome = festivals.reduce((sum, f) => sum + f.totalIncome, 0);
  const totalExpense = festivals.reduce((sum, f) => sum + f.totalExpense, 0);
  const totalSurplus = festivals.reduce((sum, f) => sum + f.surplus, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Festival Management</h1>
          <p className="text-muted-foreground mt-1">Track festival-wise income and expenses</p>
        </div>
        {userRole !== "ADMIN" && (
          <Link href="/dashboard/festivals/new">
            <Button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
              New Festival
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      {!loading && festivals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalBudget.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {totalIncome.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {totalExpense.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Surplus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalSurplus >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {totalSurplus.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Festivals</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading festivals...</p>
          ) : festivals.length === 0 ? (
            <p className="text-gray-600">No festivals found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Festival Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Budget</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Income</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Expense</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Surplus</th>
                  </tr>
                </thead>
                <tbody>
                  {festivals.map((festival) => (
                    <tr key={festival.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/festivals/${festival.id}`}
                          className="text-emerald-600 hover:underline"
                        >
                          {festival.festivalName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(festival.festivalDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {festival.budgetAmount.toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                        {festival.totalIncome.toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right text-destructive font-semibold">
                        {festival.totalExpense.toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${festival.surplus >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {festival.surplus.toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
