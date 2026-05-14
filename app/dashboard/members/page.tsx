"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { UserPlus, Edit2, Trash2, AlertCircle, Shield } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  userType?: string;
  isActive: boolean;
}

const roleBadgeCls: Record<string, string> = {
  ADMIN: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200",
  ACCOUNTANT:
    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200",
  MEMBER:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200",
};

export default function MembersPage() {
  const { data: session } = useSession();
  const [roleFilter, setRoleFilter] = useState("ALL");

  const { data: members = [] } = useSWR<Member[]>("/api/users", fetcher);

  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertCircle className="text-destructive h-6 w-6 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-destructive">Access Denied</h3>
              <p className="text-destructive/80 text-sm mt-1">
                Only administrators can manage members
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredMembers = members.filter(
    (m) => roleFilter === "ALL" || m.role === roleFilter
  );

  // ── Column Definitions ───────────────────────────────────────────────────────
  const columns: ColumnDef<Member>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="font-medium text-foreground">{getValue<string>()}</span>
        </div>
      ),
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{getValue<string>()}</span>
      ),
    },
    {
      id: "role",
      accessorKey: "role",
      header: "System Role",
      cell: ({ getValue }) => {
        const role = getValue<string>();
        return (
          <Badge className={`${roleBadgeCls[role] ?? "bg-muted text-muted-foreground"} text-xs font-medium`}>
            {role}
          </Badge>
        );
      },
    },
    {
      id: "userType",
      accessorKey: "userType",
      header: "Temple Role",
      cell: ({ getValue }) => (
        <Badge
          variant="outline"
          className="text-[10px] uppercase font-bold text-muted-foreground border-muted-foreground/20"
        >
          {(getValue<string>() || "MEMBER").replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      id: "isActive",
      accessorKey: "isActive",
      header: "Status",
      cell: ({ getValue }) => {
        const active = getValue<boolean>();
        return (
          <Badge variant={active ? "default" : "secondary"}>
            {active ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <Link href={`/dashboard/members/${row.original.id}`}>
            <Button variant="ghost" size="sm" title="Edit member">
              <Edit2 className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            title="Delete member"
            onClick={async () => {
              if (confirm(`Are you sure you want to delete ${row.original.name}?`)) {
                try {
                  const res = await fetch(`/api/users/${row.original.id}`, {
                    method: "DELETE",
                  });
                  if (!res.ok) throw new Error("Failed to delete member");
                  toast.success("Member deleted successfully");
                  mutate("/api/users");
                } catch (error) {
                  toast.error("Error deleting member");
                }
              }
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members Management</h1>
          <p className="text-muted-foreground mt-1">Manage users and their roles</p>
        </div>
        <Link href="/dashboard/members/new">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members ({filteredMembers.length})</CardTitle>
          <CardDescription>Total users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredMembers}
            searchPlaceholder="Search by name or email…"
            toolbarRight={
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                </SelectContent>
              </Select>
            }
            emptyState={
              <p className="text-muted-foreground py-4">No members found</p>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
