'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewFestivalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    festivalName: '',
    festivalDate: '',
    description: '',
    budgetAmount: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/festivals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create festival');

      toast.success('Festival created successfully');
      router.push('/dashboard/festivals');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/festivals">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Festival</h1>
          <p className="text-gray-600">Register a new festival event</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Festival Details</CardTitle>
          <CardDescription>Enter the details for the upcoming festival</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Festival Name</label>
              <Input
                required
                value={formData.festivalName}
                onChange={(e) => setFormData({ ...formData, festivalName: e.target.value })}
                placeholder="e.g. Maha Shivaratri"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Festival Date</label>
              <Input
                required
                type="date"
                value={formData.festivalDate}
                onChange={(e) => setFormData({ ...formData, festivalDate: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Budget Amount (₹)</label>
              <Input
                required
                type="number"
                min="0"
                value={formData.budgetAmount}
                onChange={(e) => setFormData({ ...formData, budgetAmount: parseFloat(e.target.value) })}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the festival events"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href="/dashboard/festivals">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Festival
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
