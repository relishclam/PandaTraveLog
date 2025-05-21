import { cn } from "@/lib/utils";
import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional custom animation
   */
  animation?: "pulse" | "wave" | "none";
}

/**
 * Skeleton component with smooth animations for loading states
 */
export function Skeleton({
  className,
  animation = "pulse",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-gray-200",
        {
          "animate-pulse": animation === "pulse",
          "animate-shimmer": animation === "wave",
        },
        className
      )}
      {...props}
    />
  );
}

// Add a custom PO-themed skeleton that uses the panda mascot for a more branded experience
export function PandaSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col items-center py-4", className)} {...props}>
      <div className="w-20 h-20 relative animate-bounce-slow">
        <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" 
          style={{ backgroundImage: "url('/images/po/emotions/thinking.png')" }} />
      </div>
      <div className="mt-4 w-48 h-2 bg-gray-200 rounded animate-pulse" />
      <div className="mt-2 w-32 h-2 bg-gray-200 rounded animate-pulse delay-150" />
    </div>
  );
}

// You'll need to add these animations to your tailwind.config.js:
// extend: {
//   keyframes: {
//     shimmer: {
//       '0%': { backgroundPosition: '-200% 0' },
//       '100%': { backgroundPosition: '200% 0' },
//     },
//     'bounce-slow': {
//       '0%, 100%': { transform: 'translateY(0)' },
//       '50%': { transform: 'translateY(-10px)' },
//     },
//   },
//   animation: {
//     shimmer: 'shimmer 1.5s ease-in-out infinite',
//     'bounce-slow': 'bounce-slow 2s ease-in-out infinite',
//   },
// }
