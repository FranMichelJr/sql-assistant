import * as React from 'react'
import { cn } from '@/lib/utils'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, maxHeight, style, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('overflow-y-auto scrollbar-thin', className)}
      style={{ maxHeight, ...style }}
      {...props}
    >
      {children}
    </div>
  )
)
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
