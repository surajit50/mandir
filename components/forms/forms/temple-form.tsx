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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const templeSchema = z.object({
  templeName: z.string().min(1, "Temple name is required"),
  templeCode: z.string().min(1, "Temple code is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  registrationNumber: z.string().optional(),
  gstNumber: z.string().optional(),
});

type TempleFormValues = z.infer<typeof templeSchema>;

export function TempleForm() {
  const router = useRouter();

  const form = useForm<TempleFormValues>({
    resolver: zodResolver(templeSchema),
    defaultValues: {
      templeName: "",
      templeCode: "",
      address: "",
      city: "",
      state: "",
      pinCode: "",
      phone: "",
      email: "",
      registrationNumber: "",
      gstNumber: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: TempleFormValues) => {
    try {
      const res = await fetch("/api/temples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create temple");
        return;
      }

      toast.success("Temple created successfully");
      router.push("/dashboard/temples");
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/temples">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Temple</h1>
          <p className="text-gray-600">Register a new temple entity</p>
        </div>
      </div>

      <Card className="max-w-2xl border-amber-200">
        <CardHeader>
          <CardTitle>Temple Details</CardTitle>
          <CardDescription>Enter the primary details for the new temple</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="templeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temple Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sri Rama Mandir" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="templeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temple Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. SRM-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pinCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pin Code</FormLabel>
                      <FormControl>
                        <Input placeholder="ZIP / PIN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="temple@example.com" {...field} />
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
                        <Input placeholder="Contact number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Trust Reg No." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="GSTIN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Link href="/dashboard/temples">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Register Temple
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
