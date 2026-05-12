"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, TrendingUp, DollarSign } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  accountHolder: string;
  accountType: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

export default function BankAccountsPage() {
  const { data: accounts, error, isLoading, mutate } = useSWR<BankAccount[]>(
    "/api/bank-accounts",
    fetcher
  );

  const totalBalance = accounts?.reduce((sum, acc) => sum + acc.currentBalance, 0) || 0;
  const totalOpeningBalance = accounts?.reduce((sum, acc) => sum + acc.openingBalance, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
          <p className="text-muted-foreground mt-2">Manage all temple trust bank accounts</p>
        </div>
        <Link href="/dashboard/bank-accounts/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            New Account
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Opening Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              ₹{totalOpeningBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Current Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              ₹{totalBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading bank accounts...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading bank accounts</p>
          </CardContent>
        </Card>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {account.bankName}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {account.accountNumber}
                    </p>
                  </div>
                  {!account.isActive && (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-destructive/10 text-destructive">
                      Inactive
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Holder</p>
                    <p className="font-medium text-foreground">{account.accountHolder}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium text-foreground">{account.accountType}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Opening Balance</p>
                    <p className="font-semibold text-foreground">
                      ₹{account.openingBalance.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <p className="font-semibold text-emerald-600">
                      ₹{account.currentBalance.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href={`/dashboard/bank-accounts/${account.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No bank accounts found</p>
            <Link href="/dashboard/bank-accounts/new">
              <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">Create First Account</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
