import { forwardRef, type ReactElement, type Ref } from 'react';
import { twMerge } from 'tailwind-merge';
import type { InputProps } from './Input.types';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, twStyles, type = 'text', ...props }: InputProps,
    ref: Ref<HTMLInputElement>
  ): ReactElement => (
    <input
      {...props}
      ref={ref}
      type={type}
      className={twMerge(
        'rounded-md border border-white/10 bg-white/8 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/70',
        className,
        twStyles
      )}
    />
  )
);

Input.displayName = 'Input';
