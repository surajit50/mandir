'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Users, Mail, Phone } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Payee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  payeeType: string;
}

export default function PayeesPage() {
  const { data: session } = useSession();
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayees();
  }, []);

  const fetchPayees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payees');
      if (!res.ok) throw new Error('Failed to fetch payees');
      const data = await res.json();
      setPayees(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching payees');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payees & Contacts</h1>
          <p className="text-muted-foreground mt-1">Manage all registered vendors and contacts</p>
        </div>
        {session?.user?.role !== "MEMBER" && (
          <Link href="/dashboard/payees/new">
            <Button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700">
              <Users className="w-4 h-4" />
              New Contact
            </Button>
          </Link>
        )}
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
          <CardTitle>Registered Payees</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading payees...</p>
          ) : payees.length === 0 ? (
            <p className="text-muted-foreground">No payees found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {payees.map((payee) => (
                <Card key={payee.id} className="border-amber-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-900">{payee.name}</h3>
                        <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">{payee.payeeType || "OTHER"}</p>
                      </div>
                    </div>
                    {payee.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                        <Mail className="w-4 h-4" />
                        {payee.email}
                      </div>
                    )}
                    {payee.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Phone className="w-4 h-4" />
                        {payee.phone}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
