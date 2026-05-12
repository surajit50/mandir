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

export default function NewGLAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    accountCode: '',
    accountName: '',
    accountType: '',
    subType: '',
    openingBalance: 0,
    description: '',
  });

  const accountTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountType) {
      toast.error('Please select an account type');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/gl-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create GL account');

      toast.success('GL Account created successfully');
      router.push('/dashboard/gl-accounts');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/gl-accounts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New GL Account</h1>
          <p className="text-gray-600">Create a new General Ledger account</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Define the properties of the new ledger account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Account Code</label>
                <Input
                  required
                  value={formData.accountCode}
                  onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                  placeholder="e.g. 1001"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Account Name</label>
                <Input
                  required
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="e.g. Cash in Hand"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Account Type</label>
                <Select 
                  value={formData.accountType} 
                  onValueChange={(v) => setFormData({ ...formData, accountType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Opening Balance (₹)</label>
                <Input
                  type="number"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Sub Type (Optional)</label>
              <Input
                value={formData.subType}
                onChange={(e) => setFormData({ ...formData, subType: e.target.value })}
                placeholder="e.g. Current Asset"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the account"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href="/dashboard/gl-accounts">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
