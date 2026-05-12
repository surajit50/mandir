'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Plus, AlertTriangle } from 'lucide-react';

interface InventoryItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: { categoryName: string };
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory');
      
      if (!res.ok) throw new Error('Failed to fetch inventory');
      
      const data = await res.json();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching inventory');
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = items.filter((item) => item.quantity <= item.reorderLevel);
  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Track temple assets and supplies</p>
        </div>
        <Link href="/dashboard/inventory/new">
          <Button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" />
            New Item
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{items.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalValue.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}
              </div>
            </CardContent>
          </Card>

          <Card className={lowStockItems.length > 0 ? 'border-orange-200 bg-orange-50' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {lowStockItems.length > 0 && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-orange-600' : ''}`}>
                {lowStockItems.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {lowStockItems.slice(0, 5).map((item) => (
                <li key={item.id} className="text-sm text-orange-800">
                  <strong>{item.itemName}</strong> ({item.itemCode}) - Current: {item.quantity} {item.unit}, Reorder Level: {item.reorderLevel} {item.unit}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading inventory...</p>
          ) : items.length === 0 ? (
            <p className="text-gray-600">No inventory items found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Code</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Item Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Category</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Quantity</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Unit</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Reorder Level</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Unit Cost</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-sm">{item.itemCode}</td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/inventory/${item.id}`}
                          className="text-emerald-600 hover:underline"
                        >
                          {item.itemName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm">{item.category.categoryName}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${item.quantity <= item.reorderLevel ? 'text-amber-600' : ''}`}>
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4">{item.unit}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{item.reorderLevel}</td>
                      <td className="py-3 px-4 text-right">
                        {item.unitCost.toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {(item.quantity * item.unitCost).toLocaleString('en-IN', {
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
