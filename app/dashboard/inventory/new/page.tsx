'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function NewInventoryItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { data: categories, mutate: mutateCategories } = useSWR('/api/inventory/categories', fetcher);
  
  const [formData, setFormData] = useState({
    itemCode: '',
    itemName: '',
    categoryId: '',
    unit: '',
    quantity: 0,
    reorderLevel: 0,
    unitCost: 0,
    description: '',
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    try {
      const res = await fetch('/api/inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryName: newCategoryName }),
      });
      if (res.ok) {
        toast.success('Category added');
        setNewCategoryName('');
        setIsAddingCategory(false);
        mutateCategories();
      }
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create item');
      }

      toast.success('Inventory item created');
      router.push('/dashboard/inventory');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Inventory Item</h1>
          <p className="text-gray-600">Add a new item to the trust inventory</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
          <CardDescription>Enter the specifications for the new inventory item</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Item Code</label>
                <Input
                  required
                  value={formData.itemCode}
                  onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                  placeholder="e.g. INV001"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Item Name</label>
                <Input
                  required
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  placeholder="e.g. Saffron Powder"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Category</label>
              <div className="flex gap-2">
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.categoryName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isAddingCategory ? (
                  <Button type="button" variant="outline" onClick={() => setIsAddingCategory(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="New category" 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-32"
                    />
                    <Button type="button" onClick={handleAddCategory}>Add</Button>
                    <Button type="button" variant="ghost" onClick={() => setIsAddingCategory(false)}>Cancel</Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Unit</label>
                <Input
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g. Kg, Pcs, Liters"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Unit Cost (₹)</label>
                <Input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unitCost}
                  onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Initial Quantity</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Reorder Level</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional notes about the item"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href="/dashboard/inventory">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Item
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
