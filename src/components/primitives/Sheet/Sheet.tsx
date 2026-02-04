import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { useBackButton } from '@/platform';
import {
  backdrop,
  backdropTransition,
  sheetSlideUp,
  sheetTransition,
} from '../../motion/transitions';

// Close icon
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M12 4L4 12M4 4l8 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Context for AnimatePresence and control
interface SheetContextValue {
  open: boolean;
  onClose: () => void;
}

const SheetContext = createContext<SheetContextValue>({
  open: false,
  onClose: () => {},
});

// Root
export interface SheetProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  onClose?: () => void;
}

export const Sheet = ({ children, open, onOpenChange, onClose, ...props }: SheetProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else {
        setInternalOpen(newOpen);
      }

      if (!newOpen && onClose) {
        onClose();
      }
    },
    [onOpenChange, onClose],
  );

  const handleClose = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange} {...props}>
      <SheetContext.Provider value={{ open: isOpen, onClose: handleClose }}>
        {children}
      </SheetContext.Provider>
    </DialogPrimitive.Root>
  );
};

// Trigger
export const SheetTrigger = DialogPrimitive.Trigger;

// Portal
export const SheetPortal = DialogPrimitive.Portal;

// Close
export const SheetClose = DialogPrimitive.Close;

// Overlay
export type SheetOverlayProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;

export const SheetOverlay = forwardRef<HTMLDivElement, SheetOverlayProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-sm', className)}
      asChild
      {...props}
    >
      <motion.div
        variants={backdrop}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={backdropTransition}
      />
    </DialogPrimitive.Overlay>
  ),
);

SheetOverlay.displayName = 'SheetOverlay';

// Content
export interface SheetContentProps extends ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  showDragHandle?: boolean;
  showCloseButton?: boolean;
  enableDragToClose?: boolean;
  closeThreshold?: number;
}

export const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  (
    {
      className,
      children,
      showDragHandle = true,
      showCloseButton = false,
      enableDragToClose = true,
      closeThreshold = 0.3,
      ...props
    },
    ref,
  ) => {
    const { open, onClose } = useContext(SheetContext);
    const { haptic } = usePlatform();
    const dragControls = useDragControls();
    // Back button integration
    useBackButton(open ? onClose : null);

    const handleDragEnd = useCallback(
      (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const velocity = info.velocity.y;
        const offset = info.offset.y;
        const height = window.innerHeight;

        // Close if dragged down fast enough or past threshold
        if (velocity > 500 || offset > height * closeThreshold) {
          haptic.impact('light');
          onClose();
        }
      },
      [closeThreshold, haptic, onClose],
    );

    return (
      <SheetPortal forceMount>
        <AnimatePresence mode="wait">
          {open && (
            <>
              <SheetOverlay />
              <DialogPrimitive.Content
                ref={ref}
                className={cn(
                  'fixed inset-x-0 bottom-0 z-50',
                  'flex flex-col',
                  'max-h-[85vh]',
                  'rounded-t-2xl border-t border-dark-700/50 bg-dark-900/95 backdrop-blur-linear',
                  'shadow-linear-lg',
                  'focus:outline-none',
                  'pb-[env(safe-area-inset-bottom,0px)]',
                  className,
                )}
                asChild
                {...props}
              >
                <motion.div
                  variants={sheetSlideUp}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={sheetTransition}
                  drag={enableDragToClose ? 'y' : false}
                  dragControls={dragControls}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={handleDragEnd}
                >
                  {/* Drag handle */}
                  {showDragHandle && (
                    <div
                      className="flex cursor-grab justify-center pb-2 pt-3 active:cursor-grabbing"
                      onPointerDown={(e) => dragControls.start(e)}
                    >
                      <div className="h-1 w-10 rounded-full bg-dark-600" />
                    </div>
                  )}

                  {/* Close button */}
                  {showCloseButton && (
                    <DialogPrimitive.Close
                      className={cn(
                        'absolute right-4 top-4 rounded-linear p-1.5',
                        'text-dark-400 opacity-70 transition-all',
                        'hover:bg-dark-800/80 hover:opacity-100',
                        'focus:outline-none focus:ring-2 focus:ring-accent-500/50',
                      )}
                    >
                      <CloseIcon />
                      <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                  )}

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
                </motion.div>
              </DialogPrimitive.Content>
            </>
          )}
        </AnimatePresence>
      </SheetPortal>
    );
  },
);

SheetContent.displayName = 'SheetContent';

// Header
export type SheetHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const SheetHeader = ({ className, ...props }: SheetHeaderProps) => (
  <div
    className={cn('flex flex-col space-y-1.5 px-2 pt-2 text-center sm:text-left', className)}
    {...props}
  />
);

SheetHeader.displayName = 'SheetHeader';

// Footer
export type SheetFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const SheetFooter = ({ className, ...props }: SheetFooterProps) => (
  <div
    className={cn('flex flex-col gap-2 px-2 pt-4 sm:flex-row sm:justify-end', className)}
    {...props}
  />
);

SheetFooter.displayName = 'SheetFooter';

// Title
export type SheetTitleProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;

export const SheetTitle = forwardRef<HTMLHeadingElement, SheetTitleProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold text-dark-100', className)}
      {...props}
    />
  ),
);

SheetTitle.displayName = 'SheetTitle';

// Description
export type SheetDescriptionProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;

export const SheetDescription = forwardRef<HTMLParagraphElement, SheetDescriptionProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-dark-400', className)}
      {...props}
    />
  ),
);

SheetDescription.displayName = 'SheetDescription';
