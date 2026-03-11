"use client";

import { useCallback } from "react";

interface NumericInputProps {
  value: string;
  onChange: (value: string) => void;
  allowDecimals?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function NumericInput({
  value,
  onChange,
  allowDecimals = false,
  placeholder,
  required,
  className,
}: NumericInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "") {
        onChange(val);
        return;
      }
      const pattern = allowDecimals ? /^\d*\.?\d{0,2}$/ : /^\d*$/;
      if (pattern.test(val)) {
        onChange(val);
      }
    },
    [allowDecimals, onChange]
  );

  return (
    <input
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
