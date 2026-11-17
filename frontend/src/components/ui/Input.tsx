import React, { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required,
  children,
  className,
}) => {
  return (
    <div className={twMerge('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-[#4B5563]">
          {label} {required && <span className="text-[#0071E3]">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <span className="text-xs text-[#6B7280]">{hint}</span>
      )}
      {error && (
        <span className="text-xs text-[#DC2626] font-medium">{error}</span>
      )}
    </div>
  );
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={twMerge(
          clsx(
            'w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-[#D1D5DB] text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all duration-150 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#DC2626] focus:border-[#DC2626]',
            className
          )
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={twMerge(
          clsx(
            'w-full p-3.5 rounded-xl text-xs bg-white border border-[#D1D5DB] text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all duration-150 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#DC2626] focus:border-[#DC2626]',
            className
          )
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={twMerge(
          clsx(
            'w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-[#D1D5DB] text-[#111827] outline-none transition-all duration-150 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            error && 'border-[#DC2626] focus:border-[#DC2626]',
            className
          )
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';
