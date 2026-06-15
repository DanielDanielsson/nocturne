import { forwardRef, type ReactElement, type Ref } from 'react';
import { twMerge } from 'tailwind-merge';
import type { ButtonProps } from './Button.types';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { ariaLabel, children, twStyles, className, ...rest }: ButtonProps,
    ref: Ref<HTMLButtonElement>
  ): ReactElement | null => (
    <button
      aria-label={ariaLabel}
      className={twMerge(
        'inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm font-medium transition',
        rest.disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer bg-white/8 text-white hover:bg-white/12',
        className,
        twStyles
      )}
      ref={ref}
      type="button"
      {...rest}
    >
      {children}
    </button>
  )
);

Button.displayName = 'Button';
