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
        <label className="text-xs font-semibold uppercase tracking-wider text-[#d6d6d5]">
          {label} {required && <span className="text-apple-accent">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <span className="text-xs text-[#d6d6d5]/60">{hint}</span>
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
            'w-full px-3.5 py-2.5 rounded-none text-sm bg-[#121315] border border-[#222325] text-[#faf8f9] placeholder:text-[#d6d6d5]/40 outline-none transition-all duration-200 focus:border-apple-accent focus:ring-1 focus:ring-apple-accent/40 disabled:opacity-50 disabled:pointer-events-none',
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
            'w-full px-3.5 py-2.5 rounded-none text-sm bg-[#121315] border border-[#222325] text-[#faf8f9] placeholder:text-[#d6d6d5]/40 outline-none transition-all duration-200 focus:border-apple-accent focus:ring-1 focus:ring-apple-accent/40 disabled:opacity-50 disabled:pointer-events-none',
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
            'w-full px-3.5 py-2.5 rounded-none text-sm bg-[#121315] border border-[#222325] text-[#faf8f9] outline-none transition-all duration-200 focus:border-apple-accent focus:ring-1 focus:ring-apple-accent/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
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
