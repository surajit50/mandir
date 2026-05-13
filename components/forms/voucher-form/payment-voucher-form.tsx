"use client";

import { useRouter } from "next/navigation";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  VoucherFormSchema,
  VoucherFormValues,
} from "@/lib/validations/voucher-form-schema";

import { Button } from "@/components/ui/button";

import { FormInput } from "@/components/form/form-input";

import { FormSelect } from "@/components/form/form-select";

import { toast } from "sonner";

export function PaymentVoucherForm() {
  const router = useRouter();

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(VoucherFormSchema),

    defaultValues: {
      voucherDate: new Date().toISOString().split("T")[0],

      voucherType: "PAYMENT",

      paymentMethod: "CASH",

      payeeName: "",

      payeeEmail: "",

      payeeType: "OTHER",

      amount: 0,

      description: "",
    },
  });

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const voucherType = watch("voucherType");

  const onSubmit = async (values: VoucherFormValues) => {
    try {
      const response = await fetch("/api/vouchers", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create voucher");
        return;
      }

      toast.success("Voucher created successfully");

      router.push(`/dashboard/vouchers/${data.id}`);
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 max-w-3xl mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelect
          label="Voucher Type"
          value={voucherType}
          onChange={(value) =>
            setValue("voucherType", value as "PAYMENT" | "RECEIPT")
          }
          options={[
            {
              label: "Payment",
              value: "PAYMENT",
            },
            {
              label: "Receipt",
              value: "RECEIPT",
            },
          ]}
        />

        <FormInput
          label="Voucher Date"
          type="date"
          value={watch("voucherDate")}
          onChange={(value) => setValue("voucherDate", value)}
        />
      </div>

      <FormInput
        label="Payee Name"
        value={watch("payeeName")}
        onChange={(value) => setValue("payeeName", value)}
        required
      />

      <FormInput
        label="Email"
        value={watch("payeeEmail") || ""}
        onChange={(value) => setValue("payeeEmail", value)}
      />

      <FormInput
        label="Amount"
        type="number"
        value={watch("amount")}
        onChange={(value) => setValue("amount", Number(value))}
        required
      />

      <div>
        <label className="text-sm font-medium block mb-2">
          Description
        </label>

        <textarea
          className="w-full border rounded-lg px-3 py-2"
          rows={4}
          value={watch("description")}
          onChange={(e) =>
            setValue("description", e.target.value)
          }
        />

        {errors.description && (
          <p className="text-red-500 text-sm mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting
          ? "Creating..."
          : "Create Voucher"}
      </Button>
    </form>
  );
}
