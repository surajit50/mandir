"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface FYPeriodConfig {
  id: string;
  periodName: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedDate?: string;
}

interface FinancialYearDetail {
  id: string;
  yearCode: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isLocked: boolean;
  periodConfigs: FYPeriodConfig[];
}

export default function FinancialYearDetailPage() {
  const params = useParams();
  const yearId = params.id as string;

  const [year, setYear] = useState<FinancialYearDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchYear();
  }, [yearId]);

  const fetchYear = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/financial-years/${yearId}`);
      if (!res.ok) throw new Error("Failed to fetch financial year details");
      const data = await res.json();
      setYear(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error fetching financial year",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = async () => {
    if (!year) return;
    try {
      const res = await fetch(`/api/financial-years/${yearId}/lock`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success(year.isLocked ? "Year unlocked" : "Year locked");
        fetchYear();
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );

  if (error || !year)
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">
          {error || "Financial year not found"}
        </p>
        <Link href="/dashboard/financial-years">
          <Button variant="outline">Back to Financial Years</Button>
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/financial-years">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{year.yearCode}</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              {new Date(year.startDate).toLocaleDateString()} -{" "}
              {new Date(year.endDate).toLocaleDateString()}
              {year.isCurrent && (
                <Badge className="bg-green-600">Current</Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={year.isLocked ? "outline" : "destructive"}
            onClick={toggleLock}
          >
            {year.isLocked ? (
              <>
                <Unlock className="w-4 h-4 mr-2" /> Unlock Year
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" /> Lock Year
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {year.isLocked ? (
                <Badge variant="destructive" className="text-lg py-1 px-3">
                  Locked
                </Badge>
              ) : (
                <Badge variant="default" className="text-lg py-1 px-3">
                  Open
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Closed Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {year.periodConfigs.filter((p) => p.isClosed).length} / 12
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">12 Months</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Periods</CardTitle>
          <CardDescription>
            Management of financial periods for this year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {year.periodConfigs
                .sort((a, b) => a.periodNumber - b.periodNumber)
                .map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.periodName}
                    </TableCell>
                    <TableCell>
                      {new Date(p.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(p.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {p.isClosed ? (
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 flex items-center gap-1 w-fit"
                        >
                          <CheckCircle className="w-3 h-3 text-slate-500" />
                          Closed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-200 bg-blue-50 flex items-center gap-1 w-fit"
                        >
                          Open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!p.isClosed && !year.isLocked && (
                        <Button size="sm" variant="outline">
                          Close Period
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
