import React from 'react';
import { cn } from '../../lib/utils';

interface BaseFormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, BaseFormFieldProps {
  as?: 'input';
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement>, BaseFormFieldProps {
  as: 'select';
  options?: { value: string | number; label: string }[];
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFormFieldProps {
  as: 'textarea';
}

type FormFieldProps = InputProps | SelectProps | TextareaProps;

export const FormField = React.forwardRef<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  FormFieldProps
>((props, ref) => {
  const { label, error, hint, className, as = 'input', ...rest } = props;

  const controlStyles = cn(
    'w-full px-3.5 py-2.5 rounded-xl border bg-white/70 dark:bg-apple-darkCard/80 text-apple-text dark:text-apple-darkText placeholder:text-apple-secondary/60 text-sm transition-all duration-150',
    'border-apple-border dark:border-apple-darkBorder focus:border-apple-accent focus:ring-2 focus:ring-apple-accent/20 focus:outline-none',
    error && 'border-apple-danger focus:border-apple-danger focus:ring-apple-danger/20',
    className
  );

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-apple-secondary dark:text-apple-darkSecondary">
          {label}
        </label>
      )}

      {as === 'textarea' ? (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          rows={3}
          className={controlStyles}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : as === 'select' ? (
        <select
          ref={ref as React.Ref<HTMLSelectElement>}
          className={cn(controlStyles, 'cursor-pointer')}
          {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {'options' in props && props.options
            ? props.options.map((opt) => (
                <option key={opt.value} value={opt.value} className="dark:bg-apple-darkSurface">
                  {opt.label}
                </option>
              ))
            : rest.children}
        </select>
      ) : (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          className={controlStyles}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error ? (
        <p className="text-xs text-apple-danger font-medium mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary mt-1">{hint}</p>
      ) : null}
    </div>
  );
});

FormField.displayName = 'FormField';

