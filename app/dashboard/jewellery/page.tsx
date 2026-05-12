'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Plus, Gem, Scale, User } from 'lucide-react';

interface JewelleryAsset {
  id: string;
  jewelleryCode: string;
  jewelleryName: string;
  metalType: string;
  description: string | null;
  purity: string | null;
  weight: number;
  quantity: number;
  estimatedValue: number;
  receivedDate: string | null;
  donorName: string | null;
}

export default function JewelleryPage() {
  const [items, setItems] = useState<JewelleryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJewellery();
  }, []);

  const fetchJewellery = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/jewellery');
      
      if (!res.ok) {
        if (res.status === 404) {
          setItems([]);
          return;
        }
        throw new Error('Failed to fetch jewellery register');
      }
      
      const data = await res.json();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching jewellery');
    } finally {
      setLoading(false);
    }
  };

  const goldItems = items.filter(item => item.metalType.toLowerCase() === 'gold');
  const silverItems = items.filter(item => item.metalType.toLowerCase() === 'silver');

  const totalGoldWeight = goldItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  const totalSilverWeight = silverItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  const totalEstimatedValue = items.reduce((sum, item) => sum + item.estimatedValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jewellery Register</h1>
          <p className="text-muted-foreground mt-1">Inventory of gold and silver offerings and assets</p>
        </div>
        <Link href="/dashboard/jewellery/new">
          <Button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" />
            New Entry
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-800">Total Gold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">{totalGoldWeight.toFixed(3)}g</div>
              <p className="text-xs text-amber-600 mt-1">{goldItems.length} items</p>
            </CardContent>
          </Card>

          <Card className="border-slate-300 bg-slate-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-800">Total Silver</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-700">{totalSilverWeight.toFixed(3)}g</div>
              <p className="text-xs text-slate-600 mt-1">{silverItems.length} items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{items.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Combined assets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Est. Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalEstimatedValue.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Market valuation</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Jewellery Asset Register</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading jewellery register...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <Gem className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground">No jewellery entries found</p>
              <Link href="/dashboard/jewellery/new" className="mt-4 inline-block">
                <Button variant="outline" size="sm">Add new entry</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Code</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Item Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Metal</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Purity</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Weight (g)</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Qty</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Donor</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Est. Value</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{item.jewelleryCode}</td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/jewellery/${item.id}`}
                          className="font-medium text-emerald-600 hover:underline"
                        >
                          {item.jewelleryName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.metalType.toLowerCase() === 'gold' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                          {item.metalType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{item.purity || 'N/A'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Scale className="w-3 h-3 text-muted-foreground" />
                          {item.weight.toFixed(3)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">{item.quantity}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-muted-foreground truncate max-w-[150px]">
                          <User className="w-3 h-3" />
                          {item.donorName || 'Temple Asset'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {item.estimatedValue.toLocaleString('en-IN', {
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
