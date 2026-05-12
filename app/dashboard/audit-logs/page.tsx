'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  timestamp: string;
  status: string;
  errorMessage?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    module: '',
  });

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.action && { action: filters.action }),
        ...(filters.module && { module: filters.module }),
      });
      
      const res = await fetch(`/api/audit-logs?${params}`);
      
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Only admin users can view audit logs');
        }
        throw new Error('Failed to fetch audit logs');
      }
      
      const data = await res.json();
      setLogs(data.logs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching audit logs');
    } finally {
      setLoading(false);
    }
  };

  const actionTypes = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'];
  const modules = [
    'DonationCollection',
    'PaymentVoucher',
    'CashHandover',
    'BankAccount',
    'GLAccount',
    'Festival',
    'Inventory',
    'FinancialYear',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-gray-600 mt-1">Track all system activities and changes</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </CardContent>
        </Card>
      )}

      {!error && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Action</label>
                  <select
                    value={filters.action}
                    onChange={(e) => {
                      setFilters({ ...filters, action: e.target.value });
                      setPage(1);
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">All Actions</option>
                    {actionTypes.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Module</label>
                  <select
                    value={filters.module}
                    onChange={(e) => {
                      setFilters({ ...filters, module: e.target.value });
                      setPage(1);
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">All Modules</option>
                    {modules.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading audit logs...</p>
              ) : logs.length === 0 ? (
                <p className="text-gray-600">No audit logs found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">Timestamp</th>
                        <th className="text-left py-3 px-4 font-semibold">User</th>
                        <th className="text-left py-3 px-4 font-semibold">Role</th>
                        <th className="text-left py-3 px-4 font-semibold">Action</th>
                        <th className="text-left py-3 px-4 font-semibold">Module</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-xs">
                            {new Date(log.timestamp).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">{log.userName}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {log.userRole}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">{log.module}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                log.status === 'SUCCESS'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
