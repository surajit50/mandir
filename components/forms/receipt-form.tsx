"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const receiptSchema = z.object({
  donationId: z.string().min(1, "Donation reference is required"),
  donorEmail: z.string().email().optional().or(z.literal("")),
  donorPhone: z.string().optional(),
  donorAddress: z.string().optional(),
  receiptType: z.enum(["Regular", "Provisional", "Duplicate"]).default("Regular"),
});

type ReceiptFormValues = z.infer<typeof receiptSchema>;

export function ReceiptForm() {
  const router = useRouter();
  const [donations, setDonations] = useState<any[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const res = await fetch("/api/donations");
      if (res.ok) {
        const data = await res.json();
        // Only allow generating receipts for VERIFIED donations
        setDonations(data.filter((d: any) => d.status === "VERIFIED"));
      }
    } catch (error) {
      console.error("Failed to fetch donations", error);
    } finally {
      setLoadingDonations(false);
    }
  };

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      donationId: "",
      donorEmail: "",
      donorPhone: "",
      donorAddress: "",
      receiptType: "Regular",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: ReceiptFormValues) => {
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to generate receipt");
        return;
      }

      toast.success("Receipt generated successfully");
      router.push("/dashboard/receipts");
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/receipts">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Generate Receipt</h1>
          <p className="text-gray-600">Create a new donation receipt</p>
        </div>
      </div>

      <Card className="max-w-2xl border-amber-200">
        <CardHeader>
          <CardTitle>Receipt Details</CardTitle>
          <CardDescription>Select a verified donation collection to generate its receipt</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="donationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Donation</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingDonations}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingDonations ? "Loading..." : "Select a verified donation"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {donations.map((donation) => (
                          <SelectItem key={donation.id} value={donation.id}>
                            {new Date(donation.collectionDate).toLocaleDateString("en-IN")} - ₹{donation.totalAmount} (by {donation.collector?.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="donorEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Donor Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="donor@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="donorPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Donor Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="10 digit number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="donorAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donor Address (Optional)</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-amber-200"
                        rows={3}
                        placeholder="Complete mailing address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Regular">Regular</SelectItem>
                        <SelectItem value="Provisional">Provisional</SelectItem>
                        <SelectItem value="Duplicate">Duplicate</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Link href="/dashboard/receipts">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Receipt
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
