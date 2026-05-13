"use client";

import { Input } from "@/components/ui/input";

interface FormInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

export function FormInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: FormInputProps) {
  return (
    <div>
      <label className="text-sm font-medium block mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
