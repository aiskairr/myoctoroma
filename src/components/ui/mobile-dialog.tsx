import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const MobileDialog = DialogPrimitive.Root

const MobileDialogTrigger = DialogPrimitive.Trigger

const MobileDialogPortal = DialogPrimitive.Portal

const MobileDialogClose = DialogPrimitive.Close

const MobileDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
MobileDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const MobileDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideCloseButton?: boolean;
  }
>(({ className, children, hideCloseButton, ...props }, ref) => (
  <MobileDialogPortal>
    <MobileDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Шторка снизу экрана
        "fixed bottom-0 left-0 right-0 z-50",
        "w-full border-t bg-background shadow-lg",
        // Ограничение высоты до 75vh
        "max-h-[75vh] flex flex-col",
        // Скругление только сверху (как у шторки)
        "rounded-t-3xl",
        // Анимация выезда снизу
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        "duration-300",
        className
      )}
      {...props}
    >
      {/* Характерная ручка для свайпа */}
      <div className="mx-auto mt-2 mb-2 h-1.5 w-12 rounded-full bg-gray-300" />
      
      {children}
      
      {!hideCloseButton && (
        <DialogPrimitive.Close className="absolute right-3 top-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center opacity-80 ring-offset-background transition-all hover:opacity-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </MobileDialogPortal>
))
MobileDialogContent.displayName = DialogPrimitive.Content.displayName

const MobileDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1 text-left px-4 pt-2 pb-3 flex-shrink-0 border-b",
      className
    )}
    {...props}
  />
)
MobileDialogHeader.displayName = "MobileDialogHeader"

const MobileDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-2 px-4 pb-safe pt-3 flex-shrink-0 border-t bg-background",
      // Учитываем safe area для iPhone
      "pb-[max(1rem,env(safe-area-inset-bottom))]",
      className
    )}
    {...props}
  />
)
MobileDialogFooter.displayName = "MobileDialogFooter"

const MobileDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-base font-semibold leading-none tracking-tight pr-8",
      className
    )}
    {...props}
  />
))
MobileDialogTitle.displayName = DialogPrimitive.Title.displayName

const MobileDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
MobileDialogDescription.displayName = DialogPrimitive.Description.displayName

// Специальный компонент для прокручиваемого контента
const MobileDialogScrollContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-y-auto overflow-x-hidden flex-1 px-4 py-3",
      // Кастомный scrollbar для мобильных (тонкий или скрытый)
      "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
      // Плавная прокрутка
      "scroll-smooth",
      // Инерция прокрутки для iOS
      "[overflow-scrolling:touch]",
      className
    )}
    {...props}
  />
))
MobileDialogScrollContent.displayName = "MobileDialogScrollContent"

export {
  MobileDialog,
  MobileDialogPortal,
  MobileDialogOverlay,
  MobileDialogClose,
  MobileDialogTrigger,
  MobileDialogContent,
  MobileDialogHeader,
  MobileDialogFooter,
  MobileDialogTitle,
  MobileDialogDescription,
  MobileDialogScrollContent,
}
