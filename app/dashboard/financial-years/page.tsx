'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Plus, Calendar, Lock } from 'lucide-react';

interface FinancialYear {
  id: string;
  yearCode: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isLocked: boolean;
  periodConfigs: Array<{
    id: string;
    periodName: string;
    startDate: string;
    endDate: string;
    isClosed: boolean;
  }>;
}

export default function FinancialYearsPage() {
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/financial-years');
      
      if (!res.ok) throw new Error('Failed to fetch financial years');
      
      const data = await res.json();
      setYears(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching financial years');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Financial Years</h1>
          <p className="text-gray-600 mt-1">Manage accounting periods and years</p>
        </div>
        <Link href="/dashboard/financial-years/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Financial Year
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

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p>Loading financial years...</p>
            </CardContent>
          </Card>
        ) : years.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600">No financial years found</p>
            </CardContent>
          </Card>
        ) : (
          years.map((year) => {
            const closedPeriods = year.periodConfigs.filter((p) => p.isClosed).length;
            return (
              <Card key={year.id} className={year.isLocked ? 'border-gray-300 bg-gray-50' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{year.yearCode}</CardTitle>
                        {year.isCurrent && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                            Current
                          </span>
                        )}
                        {year.isLocked && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(year.startDate).toLocaleDateString('en-IN')} to{' '}
                        {new Date(year.endDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <Link href={`/dashboard/financial-years/${year.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Period Status</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Periods:</span>
                          <span className="font-medium">{year.periodConfigs.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Closed Periods:</span>
                          <span className="font-medium text-green-600">{closedPeriods}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Open Periods:</span>
                          <span className="font-medium text-blue-600">
                            {year.periodConfigs.length - closedPeriods}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-3">Period Progress</h4>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(closedPeriods / year.periodConfigs.length) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {((closedPeriods / year.periodConfigs.length) * 100).toFixed(0)}% complete
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
