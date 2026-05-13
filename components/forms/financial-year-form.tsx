"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancialYearSchema, type FinancialYearFormValues } from "@/lib/validations/accounting";

export function FinancialYearForm() {
  const router = useRouter();

  const form = useForm<FinancialYearFormValues>({
    resolver: zodResolver(FinancialYearSchema),
    defaultValues: {
      yearCode: "",
      startDate: "",
      endDate: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: FinancialYearFormValues) => {
    try {
      const res = await fetch("/api/financial-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create financial year");
        return;
      }

      toast.success("Financial year created");
      router.push("/dashboard/financial-years");
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/financial-years">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Financial Year</h1>
          <p className="text-gray-600">Open a new financial year period</p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Financial Year Details</CardTitle>
          <CardDescription>Define the period for the new financial year</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="yearCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. FY2024-25" {...field} />
                    </FormControl>
                    <FormDescription>Format: FY2024-25</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                <p>
                  <strong>Note:</strong> Creating a new financial year will automatically generate
                  12 monthly periods for reconciliation and reporting.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Link href="/dashboard/financial-years">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Financial Year
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
