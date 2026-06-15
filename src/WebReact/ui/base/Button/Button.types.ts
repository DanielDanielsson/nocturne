import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Stylable } from '../../types';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>,
    Stylable {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
}
