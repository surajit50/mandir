"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { 
  Plus, 
  Trash2, 
  Landmark, 
  BookOpen, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ChequeBook {
  id: string;
  bookNumber: string | null;
  startChequeNo: string;
  leafCount: number;
  usedCount: number;
  accountId: string;
  account: {
    bankName: string;
    accountNumber: string;
  };
  createdAt: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
}

export default function ChequeMasterPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  
  const { data: books, error: booksError, isLoading: isLoadingBooks, mutate } = useSWR<ChequeBook[]>(
    "/api/cheque-books",
    fetcher
  );
  
  const { data: bankAccounts } = useSWR<BankAccount[]>(
    "/api/bank-accounts",
    fetcher
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    accountId: "",
    bookNumber: "",
    startChequeNumber: "",
    leafCount: "20",
  });

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId || !formData.startChequeNumber || !formData.leafCount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/cheque-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          leafCount: parseInt(formData.leafCount, 10),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to create cheque book");
        return;
      }

      toast.success("Cheque book registered successfully");
      setFormData({
        accountId: "",
        bookNumber: "",
        startChequeNumber: "",
        leafCount: "20",
      });
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, usedCount: number) => {
    if (usedCount > 0) {
      toast.error("Cannot delete a cheque book with used cheques");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this cheque book?")) {
      return;
    }

    try {
      const response = await fetch(`/api/cheque-books/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to delete cheque book");
        return;
      }

      toast.success("Cheque book deleted");
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/cheques">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Cheque Master</h1>
            <p className="text-slate-500">Manage cheque books and sequences</p>
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <Card className="rounded-3xl border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-6">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            Register New Cheque Book
          </CardTitle>
          <CardDescription className="text-slate-400">
            Define a range of cheque leaves for a bank account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Bank / Treasury Account *</label>
              <Select 
                value={formData.accountId} 
                onValueChange={(val) => handleInputChange("accountId", val)}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Cheque Book No</label>
              <Input 
                placeholder="Book Number" 
                value={formData.bookNumber}
                onChange={(e) => handleInputChange("bookNumber", e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">First Cheque No *</label>
              <Input 
                placeholder="e.g. 000001" 
                value={formData.startChequeNumber}
                onChange={(e) => handleInputChange("startChequeNumber", e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">No of Leaf *</label>
              <div className="flex gap-2">
                <Input 
                  type="number"
                  placeholder="20" 
                  value={formData.leafCount}
                  onChange={(e) => handleInputChange("leafCount", e.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cheque Books Table */}
      <Card className="rounded-3xl border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-900">Bank Account</TableHead>
                <TableHead className="font-bold text-slate-900">Cheque Book ID</TableHead>
                <TableHead className="font-bold text-slate-900">Cheque Book No</TableHead>
                <TableHead className="font-bold text-slate-900">First Cheque No</TableHead>
                <TableHead className="font-bold text-slate-900">No of Leaf</TableHead>
                <TableHead className="font-bold text-slate-900">Status</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingBooks ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading cheque books...
                  </TableCell>
                </TableRow>
              ) : books?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    No cheque books registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                books?.map((book) => (
                  <TableRow key={book.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium">{book.account.bankName}</p>
                          <p className="text-xs text-slate-500">{book.account.accountNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 uppercase">
                      {book.id.slice(-8)}
                    </TableCell>
                    <TableCell>{book.bookNumber || "—"}</TableCell>
                    <TableCell className="font-mono font-bold text-slate-700">
                      {book.startChequeNo}
                    </TableCell>
                    <TableCell>{book.leafCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${(book.usedCount / book.leafCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600">
                          {book.usedCount}/{book.leafCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                        onClick={() => handleDelete(book.id, book.usedCount)}
                        disabled={book.usedCount > 0}
                        title={book.usedCount > 0 ? "Cannot delete used book" : "Delete Book"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-3xl border-0 shadow-md bg-emerald-50 border-emerald-100">
          <CardContent className="p-6 flex gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900">Proper Range Handling</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Once a book is registered, leaves are available for voucher selection. 
                Blank leaves do not affect bank balances until used in a payment.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 shadow-md bg-slate-50 border-slate-100">
          <CardContent className="p-6 flex gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <AlertCircle className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Deletion Rules</h3>
              <p className="text-sm text-slate-700 mt-1">
                You can only delete a cheque book if none of its leaves have been used for payments. 
                Used cheques are locked for audit integrity.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
