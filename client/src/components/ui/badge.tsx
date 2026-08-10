import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-semibold tracking-wider transition-colors',
  {
    variants: {
      variant: {
        default:  'border-border bg-secondary text-muted-foreground',
        primary:  'border-primary/30 bg-primary/10 text-primary',
        success:  'border-positive/30 bg-positive/10 text-positive',
        error:    'border-destructive/30 bg-destructive/10 text-destructive',
        warning:  'border-warning/30 bg-warning/10 text-warning',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
