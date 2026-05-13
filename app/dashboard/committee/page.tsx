"use client";

import { cn } from "@/lib/utils";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  ShieldCheck, 
  UserCircle, 
  Briefcase, 
  ScrollText,
  Mail,
  Landmark,
  Crown,
  UserPlus,
  Heart,
  ChevronRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  userType: string;
  isActive: boolean;
}

const COMMITTEE_ROLES = [
  "PRESIDENT",
  "SECRETARY",
  "VICE_PRESIDENT",
  "JOINT_SECRETARY",
  "TREASURER",
  "TRUSTEE",
  "MANAGER",
  "PRIEST",
  "PUJARI",
  "ARCHAKA",
  "SEVAK",
];

const EXECUTIVE_ROLES = [
  "PRESIDENT",
  "SECRETARY",
  "VICE_PRESIDENT",
  "JOINT_SECRETARY",
  "TREASURER",
];

export default function CommitteePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { data: users = [], isLoading } = useSWR<User[]>("/api/users", fetcher);

  const committeeMembers = users.filter((u) => COMMITTEE_ROLES.includes(u.userType));
  const generalMembers = users.filter((u) => !COMMITTEE_ROLES.includes(u.userType));

  const groupedCommittee = committeeMembers.reduce((acc, user) => {
    const type = user.userType || "OTHER";
    if (!acc[type]) acc[type] = [];
    acc[type].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  const getRoleIcon = (type: string) => {
    switch (type) {
      case "PRESIDENT":
      case "SECRETARY":
      case "VICE_PRESIDENT":
      case "JOINT_SECRETARY":
      case "TREASURER":
        return <Crown className="w-4 h-4 text-amber-500" />;
      case "TRUSTEE":
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case "MANAGER":
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case "PRIEST":
      case "PUJARI":
      case "ARCHAKA":
        return <ScrollText className="w-4 h-4 text-amber-600" />;
      default:
        return <Users className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleLabel = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" />
            Trust Committee Directory
          </h1>
          <p className="text-slate-500 text-sm">
            Official list of office bearers, trustees, and functional members of the temple trust.
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/members/new">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </Link>
        )}
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[300px] font-semibold text-slate-900">Member Name</TableHead>
                <TableHead className="font-semibold text-slate-900">Designation</TableHead>
                <TableHead className="font-semibold text-slate-900">Contact / Email</TableHead>
                <TableHead className="font-semibold text-slate-900">System Access</TableHead>
                <TableHead className="text-right font-semibold text-slate-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : (
                <>
                  {/* Executive Committee Section */}
                  {EXECUTIVE_ROLES.some(role => groupedCommittee[role]) && (
                    <>
                      <TableRow className="bg-amber-50/40 hover:bg-amber-50/40 border-y border-amber-100">
                        <TableCell colSpan={5} className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
                              Executive Committee (Office Bearers)
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {EXECUTIVE_ROLES.map(role => 
                        groupedCommittee[role]?.map(member => (
                          <MemberRow 
                            key={member.id} 
                            member={member} 
                            icon={getRoleIcon(role)} 
                            label={getRoleLabel(role)}
                            isPriority
                          />
                        ))
                      )}
                    </>
                  )}

                  {/* Trustees Section */}
                  {groupedCommittee["TRUSTEE"] && (
                    <>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-y border-slate-100">
                        <TableCell colSpan={5} className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                              Board of Trustees
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {groupedCommittee["TRUSTEE"].map((member) => (
                        <MemberRow 
                          key={member.id} 
                          member={member} 
                          icon={getRoleIcon("TRUSTEE")} 
                          label="Trustee" 
                        />
                      ))}
                    </>
                  )}

                  {/* Functional Staff Section */}
                  {Object.entries(groupedCommittee)
                    .filter(([role]) => !EXECUTIVE_ROLES.includes(role) && role !== "TRUSTEE")
                    .length > 0 && (
                    <>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-y border-slate-100">
                        <TableCell colSpan={5} className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                              Functional & Operational Staff
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {Object.entries(groupedCommittee)
                        .filter(([role]) => !EXECUTIVE_ROLES.includes(role) && role !== "TRUSTEE")
                        .map(([role, members]) => (
                          members.map(member => (
                            <MemberRow 
                              key={member.id} 
                              member={member} 
                              icon={getRoleIcon(role)} 
                              label={getRoleLabel(role)} 
                            />
                          ))
                        ))}
                    </>
                  )}

                  {/* General Members Section */}
                  {generalMembers.length > 0 && (
                    <>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-y border-slate-100">
                        <TableCell colSpan={5} className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                              General Members
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {generalMembers.map((member) => (
                        <MemberRow 
                          key={member.id} 
                          member={member} 
                          icon={<UserCircle className="w-4 h-4 text-slate-400" />} 
                          label="Member" 
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({ 
  member, 
  icon, 
  label, 
  isPriority 
}: { 
  member: User, 
  icon: React.ReactNode, 
  label: string, 
  isPriority?: boolean 
}) {
  return (
    <TableRow className={cn("group transition-colors", isPriority && "bg-amber-50/20 hover:bg-amber-50/30")}>
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
            isPriority ? "bg-amber-100" : "bg-slate-100"
          )}>
            {icon}
          </div>
          <span className={cn("font-medium", isPriority ? "text-amber-900" : "text-slate-900")}>
            {member.name}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn(
          "font-medium border-none",
          isPriority ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
        )}>
          {label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Mail className="w-3.5 h-3.5 opacity-60" />
          {member.email}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium border",
            member.role === 'ADMIN' ? "bg-red-50 text-red-700 border-red-100" :
            member.role === 'ACCOUNTANT' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
            "bg-slate-50 text-slate-600 border-slate-100"
          )}>
            {member.role}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Badge variant={member.isActive ? "default" : "secondary"} className={cn(
          member.isActive ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" : ""
        )}>
          {member.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
