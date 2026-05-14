"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { AlertCircle, Users, Mail, Phone, Plus } from "lucide-react";
import { useSession } from "next-auth/react";

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
      const res = await fetch("/api/payees");
      if (!res.ok) throw new Error("Failed to fetch payees");
      const data = await res.json();
      setPayees(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching payees");
    } finally {
      setLoading(false);
    }
  };

  // ── Column Definitions ───────────────────────────────────────────────────────
  const columns: ColumnDef<Payee>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      cell: ({ getValue }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <span className="font-medium text-foreground">{getValue<string>()}</span>
        </div>
      ),
    },
    {
      id: "payeeType",
      accessorKey: "payeeType",
      header: "Type",
      cell: ({ getValue }) => (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700 text-xs font-semibold uppercase tracking-wide">
          {(getValue<string>() || "OTHER").replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => {
        const val = getValue<string | null>();
        return val ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4 shrink-0" />
            {val}
          </div>
        ) : (
          <span className="text-muted-foreground/50 text-xs">—</span>
        );
      },
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: "Phone",
      cell: ({ getValue }) => {
        const val = getValue<string | null>();
        return val ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4 shrink-0" />
            {val}
          </div>
        ) : (
          <span className="text-muted-foreground/50 text-xs">—</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payees &amp; Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage all registered vendors and contacts
          </p>
        </div>
        {session?.user?.role !== "MEMBER" && (
          <Link href="/dashboard/payees/new">
            <Button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-4 h-4" />
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
            <div className="py-16 text-center text-muted-foreground">
              Loading payees…
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={payees}
              searchPlaceholder="Search by name, email…"
              searchKey="name"
              emptyState={
                <p className="text-muted-foreground py-4">No payees found.</p>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
