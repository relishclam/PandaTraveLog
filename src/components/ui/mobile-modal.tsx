'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const MobileModal = DialogPrimitive.Root

const MobileModalTrigger = DialogPrimitive.Trigger

const MobileModalPortal = DialogPrimitive.Portal

const MobileModalClose = DialogPrimitive.Close

const MobileModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
MobileModalOverlay.displayName = DialogPrimitive.Overlay.displayName

const MobileModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    description?: string
  }
>(({ className, children, description, ...props }, ref) => (
  <MobileModalPortal>
    <MobileModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      aria-describedby={description ? 'modal-description' : undefined}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        // Mobile optimizations
        'max-h-[90vh] overflow-hidden',
        'sm:max-w-lg sm:rounded-lg',
        // Mobile full screen on small devices
        'max-sm:h-full max-sm:w-full max-sm:max-h-none max-sm:rounded-none max-sm:border-0',
        className
      )}
      {...props}
    >
      {description && (
        <div id="modal-description" className="sr-only">
          {description}
        </div>
      )}
      <div className="flex flex-col h-full max-sm:h-full">
        {children}
      </div>
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </MobileModalPortal>
))
MobileModalContent.displayName = DialogPrimitive.Content.displayName

const MobileModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left flex-shrink-0',
      className
    )}
    {...props}
  />
)
MobileModalHeader.displayName = 'MobileModalHeader'

const MobileModalBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex-1 overflow-y-auto overscroll-contain',
      // Custom scrollbar for better mobile experience
      'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100',
      // Ensure proper touch scrolling on iOS
      'touch-pan-y',
      className
    )}
    style={{
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'thin',
    }}
    {...props}
  />
)
MobileModalBody.displayName = 'MobileModalBody'

const MobileModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 flex-shrink-0 pt-4 border-t',
      className
    )}
    {...props}
  />
)
MobileModalFooter.displayName = 'MobileModalFooter'

const MobileModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
))
MobileModalTitle.displayName = DialogPrimitive.Title.displayName

const MobileModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
MobileModalDescription.displayName = DialogPrimitive.Description.displayName

export {
  MobileModal,
  MobileModalPortal,
  MobileModalOverlay,
  MobileModalClose,
  MobileModalTrigger,
  MobileModalContent,
  MobileModalHeader,
  MobileModalBody,
  MobileModalFooter,
  MobileModalTitle,
  MobileModalDescription,
}
