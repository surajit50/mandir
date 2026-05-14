'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Landmark, MapPin, Hash } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Temple {
  id: string;
  templeName: string;
  templeCode: string;
  address: string | null;
  city: string | null;
  state: string | null;
  registrationNumber: string | null;
}

export default function TemplesPage() {
  const { data: session } = useSession();
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemples();
  }, []);

  const fetchTemples = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/temples');
      if (!res.ok) throw new Error('Failed to fetch temples');
      const data = await res.json();
      setTemples(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching temples');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Temples</h1>
          <p className="text-muted-foreground mt-1">Manage temples under the trust</p>
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
          <CardTitle>Registered Temples</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading temples...</p>
          ) : temples.length === 0 ? (
            <p className="text-muted-foreground">No temples found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {temples.map((temple) => (
                <Card key={temple.id} className="border-amber-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Landmark className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-900 text-lg leading-tight">{temple.templeName}</h3>
                        <p className="text-xs text-amber-600 font-medium tracking-widest mt-1">CODE: {temple.templeCode}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                      {(temple.city || temple.state || temple.address) && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>
                            {temple.address ? temple.address + ", " : ""}
                            {temple.city ? temple.city + ", " : ""}
                            {temple.state}
                          </span>
                        </div>
                      )}
                      
                      {temple.registrationNumber && (
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          <span>Reg No: {temple.registrationNumber}</span>
                        </div>
                      )}
                    </div>
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
