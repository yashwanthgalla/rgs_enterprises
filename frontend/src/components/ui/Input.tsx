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
        <label className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] dark:text-gray-300">
          {label} {required && <span className="text-[#0071E3]">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <span className="text-xs text-[#6B7280] dark:text-gray-400">{hint}</span>
      )}
      {error && (
        <span className="text-xs text-[#DC2626] dark:text-red-400 font-medium">{error}</span>
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
            'w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-white/[0.05] border border-[#D1D5DB] dark:border-white/10 text-[#111827] dark:text-gray-100 placeholder:text-[#9CA3AF] dark:placeholder:text-gray-500 outline-none transition-all duration-150 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#DC2626] dark:border-red-500 focus:border-[#DC2626]',
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
            'w-full p-3.5 rounded-xl text-xs bg-white dark:bg-white/[0.05] border border-[#D1D5DB] dark:border-white/10 text-[#111827] dark:text-gray-100 placeholder:text-[#9CA3AF] dark:placeholder:text-gray-500 outline-none transition-all duration-150 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#DC2626] dark:border-red-500 focus:border-[#DC2626]',
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
            'w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-[#1E293B] border border-[#D1D5DB] dark:border-white/10 text-[#111827] dark:text-gray-100 outline-none transition-all duration-150 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            error && 'border-[#DC2626] dark:border-red-500 focus:border-[#DC2626]',
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
