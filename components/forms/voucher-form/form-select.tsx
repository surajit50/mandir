"use client";

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    label: string;
    value: string;
  }[];
  required?: boolean;
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  required,
}: FormSelectProps) {
  return (
    <div>
      <label className="text-sm font-medium block mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
      >
        <option value="">Select</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
