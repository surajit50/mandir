"use client";

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

const payeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  payeeType: z.enum([
    "PRESIDENT", "SECRETARY", "VICE_PRESIDENT", "JOINT_SECRETARY",
    "TREASURER", "PRIEST", "PUJARI", "SEVAK", "TRUSTEE", "DEVOTEE",
    "MANAGER", "ARCHAKA", "LABOUR", "VENDOR", "STAFF", "MEMBER", "OTHER"
  ]).default("OTHER"),
});

type PayeeFormValues = z.infer<typeof payeeSchema>;

export function PayeeForm() {
  const router = useRouter();

  const form = useForm<PayeeFormValues>({
    resolver: zodResolver(payeeSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      payeeType: "OTHER",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: PayeeFormValues) => {
    try {
      const res = await fetch("/api/payees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create payee");
        return;
      }

      toast.success("Payee created successfully");
      router.push("/dashboard/payees");
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/payees">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Payee/Contact</h1>
          <p className="text-gray-600">Register a new vendor or contact</p>
        </div>
      </div>

      <Card className="max-w-2xl border-amber-200">
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
          <CardDescription>Enter the details for the new payee</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name / Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ramesh Kumar or XYZ Supplies" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
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
                name="payeeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="VENDOR">Vendor</SelectItem>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                        <SelectItem value="LABOUR">Labour</SelectItem>
                        <SelectItem value="DEVOTEE">Devotee</SelectItem>
                        <SelectItem value="PRIEST">Priest / Pujari</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Link href="/dashboard/payees">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Register Contact
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
