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
    <div className={twMerge('flex flex-col gap-2', className)}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#737373]">
          {label} {required && <span className="text-[#FF3D00]">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <span className="text-xs text-[#737373]/80">{hint}</span>
      )}
      {error && (
        <span className="text-xs text-[#FF3B30] font-medium">{error}</span>
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
            'w-full px-4 h-12 rounded-none text-base bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA] placeholder:text-[#737373] outline-none transition-colors duration-150 focus:border-[#FF3D00] disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#FF3B30] focus:border-[#FF3B30]',
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
            'w-full p-4 rounded-none text-base bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA] placeholder:text-[#737373] outline-none transition-colors duration-150 focus:border-[#FF3D00] disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[#FF3B30] focus:border-[#FF3B30]',
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
            'w-full px-4 h-12 rounded-none text-base bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA] outline-none transition-colors duration-150 focus:border-[#FF3D00] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            error && 'border-[#FF3B30] focus:border-[#FF3B30]',
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
