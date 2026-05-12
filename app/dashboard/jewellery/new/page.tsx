'use client';

import { useState } from 'react';
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
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewJewelleryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    jewelleryCode: '',
    jewelleryName: '',
    metalType: 'Gold',
    description: '',
    purity: '',
    weight: 0,
    quantity: 1,
    estimatedValue: 0,
    receivedDate: '',
    donorName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/jewellery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create jewellery entry');
      }

      toast.success('Jewellery entry added successfully');
      router.push('/dashboard/jewellery');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/jewellery">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Jewellery Entry</h1>
          <p className="text-gray-600">Register new gold or silver assets/offerings</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Jewellery Details</CardTitle>
          <CardDescription>Enter the details for the gold/silver asset</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Item Code</label>
                <Input
                  required
                  value={formData.jewelleryCode}
                  onChange={(e) => setFormData({ ...formData, jewelleryCode: e.target.value })}
                  placeholder="e.g. JWL-G-001"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Item Name</label>
                <Input
                  required
                  value={formData.jewelleryName}
                  onChange={(e) => setFormData({ ...formData, jewelleryName: e.target.value })}
                  placeholder="e.g. Gold Crown"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Metal Type</label>
                <Select 
                  value={formData.metalType} 
                  onValueChange={(v) => setFormData({ ...formData, metalType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select metal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Purity (e.g. 22K, 925)</label>
                <Input
                  value={formData.purity}
                  onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                  placeholder="e.g. 22K"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Weight (in Grams)</label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.001"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Estimated Value (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Received Date</label>
                <Input
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Donor Name (if applicable)</label>
              <Input
                value={formData.donorName}
                onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                placeholder="Name of the person who offered the item"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details about the item"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href="/dashboard/jewellery">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Entry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
