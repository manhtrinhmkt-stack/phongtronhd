import React, { useState, useEffect } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const parseNumber = (str: string) => {
  return Number(str.replace(/,/g, ''));
};

export default function FormattedNumericInput({ value, onChange, className, placeholder, required }: Props) {
  const [displayValue, setDisplayValue] = useState(formatNumber(value));

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (rawValue === '') {
      setDisplayValue('');
      onChange(0);
    } else if (/^\d+$/.test(rawValue)) {
      const numValue = Number(rawValue);
      setDisplayValue(formatNumber(numValue));
      onChange(numValue);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
      required={required}
    />
  );
}
