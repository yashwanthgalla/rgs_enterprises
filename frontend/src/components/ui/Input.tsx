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
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label} {required && <span className="text-apple-danger">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>
      )}
      {error && (
        <span className="text-xs text-apple-danger font-medium">{error}</span>
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
            'w-full px-3.5 py-2.5 rounded-xl text-sm bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-[#2C2C2E] focus:border-apple-accent focus:ring-2 focus:ring-apple-accent/20 disabled:opacity-50 disabled:pointer-events-none',
            error && 'border-apple-danger focus:border-apple-danger focus:ring-apple-danger/20',
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
            'w-full px-3.5 py-2.5 rounded-xl text-sm bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-[#2C2C2E] focus:border-apple-accent focus:ring-2 focus:ring-apple-accent/20 disabled:opacity-50 disabled:pointer-events-none min-h-[90px] resize-y',
            error && 'border-apple-danger focus:border-apple-danger focus:ring-apple-danger/20',
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
            'w-full px-3.5 py-2.5 rounded-xl text-sm bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-gray-900 dark:text-gray-100 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-[#2C2C2E] focus:border-apple-accent focus:ring-2 focus:ring-apple-accent/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
            error && 'border-apple-danger focus:border-apple-danger focus:ring-apple-danger/20',
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
