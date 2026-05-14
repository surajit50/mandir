'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileText, Calendar } from 'lucide-react';

interface Receipt {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  donorName: string;
  amount: number;
  receiptType: string;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/receipts');
      if (!res.ok) throw new Error('Failed to fetch receipts');
      const data = await res.json();
      setReceipts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching receipts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donation Receipts</h1>
          <p className="text-muted-foreground mt-1">View all generated donation receipts</p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading receipts...</p>
          ) : receipts.length === 0 ? (
            <p className="text-muted-foreground">No receipts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Receipt Number</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Donor Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium text-amber-700">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-500" />
                          {receipt.receiptNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(receipt.receiptDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{receipt.donorName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          {receipt.receiptType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-600">
                        ₹{receipt.amount.toLocaleString()}
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
