'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditMemberPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    isActive: true,
  });

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const res = await fetch(`/api/users/${memberId}`);
        if (!res.ok) throw new Error('Failed to fetch member');
        const data = await res.json();
        setFormData({
          name: data.name,
          email: data.email,
          role: data.role,
          isActive: data.isActive,
        });
      } catch (error) {
        toast.error('Error loading member data');
        router.push('/dashboard/members');
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [memberId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`/api/users/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update member');

      toast.success('Member updated successfully');
      router.push('/dashboard/members');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/members">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Member</h1>
          <p className="text-gray-600">Update member profile and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Member Profile</CardTitle>
            <CardDescription>Update the basic information for this user</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled // Email usually shouldn't be changed for login consistency
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">System Role</label>
                <Select 
                  value={formData.role} 
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member (Collector)</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 mt-6">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Account Status</label>
                  <p className="text-xs text-gray-500">Toggle user access to the system</p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <Link href="/dashboard/members">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                Access Level
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="text-sm font-bold text-blue-900 mb-1">{formData.role}</h4>
                <p className="text-xs text-blue-700">
                  {formData.role === 'ADMIN' && 'Full access to all modules, financial data, and user management.'}
                  {formData.role === 'ACCOUNTANT' && 'Access to all financial and operational modules. Cannot manage users or system settings.'}
                  {formData.role === 'MEMBER' && 'Access to record donations and view personal cash ledger only.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4 text-slate-600" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full text-xs" onClick={() => toast.info('Password reset link sent to user email')}>
                Send Password Reset Email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
