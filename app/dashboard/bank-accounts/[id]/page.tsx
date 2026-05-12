"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BankAccountDetail {
  id: string;
  accountNumber: string;
  bankName: string;
  accountHolder: string;
  accountType: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function BankAccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<BankAccountDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch(`/api/bank-accounts/${accountId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch account");
        }
        const data = await response.json();
        setAccount(data);
      } catch (err) {
        setError("Failed to load account details");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccount();
  }, [accountId]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Loading account details...</p>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/bank-accounts">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Accounts
          </Button>
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const difference = account.currentBalance - account.openingBalance;
  const changePercentage = ((difference / account.openingBalance) * 100).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/bank-accounts">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">
            {account.bankName}
          </h1>
        </div>
        <span
          className={`text-sm font-medium px-3 py-1 rounded ${
            account.isActive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {account.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Opening Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              ₹{account.openingBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              ₹{account.currentBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Change
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                difference >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹{difference.toLocaleString()}
            </p>
            <p
              className={`text-xs mt-1 ${
                difference >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {difference >= 0 ? "+" : ""}{changePercentage}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-600 mb-2">Account Number</p>
            <p className="font-semibold text-slate-900">{account.accountNumber}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-2">Account Type</p>
            <p className="font-semibold text-slate-900">{account.accountType}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-2">Account Holder</p>
            <p className="font-semibold text-slate-900">{account.accountHolder}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-2">Created</p>
            <p className="font-semibold text-slate-900">
              {new Date(account.createdAt).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/dashboard/bank-reconciliation/new?accountId=${accountId}`}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Reconcile Account
          </Button>
        </Link>
      </div>
    </div>
  );
}
