import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, href, variant = 'default', size = 'default', ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
    
    const variantStyles = {
      default: "bg-backpack-orange text-white hover:bg-backpack-orange/90",
      destructive: "bg-red-500 text-white hover:bg-red-500/90",
      outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-bamboo-light text-panda-black hover:bg-bamboo-light/80",
      ghost: "hover:bg-bamboo-light hover:text-panda-black",
      link: "text-backpack-orange underline-offset-4 hover:underline",
    };
    
    const sizeStyles = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    };
    
    const classes = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className
    );
    
    if (href) {
      return (
        <Link
          href={href}
          className={classes}
        >
          {children}
        </Link>
      );
    }
    
    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
