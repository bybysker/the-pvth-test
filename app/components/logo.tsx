import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <svg 
        viewBox="0 0 283.46 283.46" 
        className="w-full h-full text-blue-700"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M124.56,71.1s-51,137.54-82.25,163.07c1.42,1.41,18.44,0,18.44,0S118.89,113.64,124.56,71.1Z"
          className="fill-current"
        />
        <path 
          d="M48.23,237.72c-6.47,0-7.36-.89-8-1.5L38,234l2.48-2c30.24-24.74,80.86-160.47,81.36-161.83l9-24.35-3.43,25.74c-5.67,42.51-61.69,159-64.08,164l-.72,1.49-1.65.14C55.26,237.54,51.17,237.72,48.23,237.72Zm46.31-86.14c-14.5,32-31.44,65-45.63,80.3,2.88,0,6.51-.22,9.94-.48C62.49,223.78,79.21,188.48,94.54,151.58ZM43.67,231.64"
          className="fill-current"
        />
        <path 
          d="M158.91,71.1s51,137.54,82.24,163.07c-1.42,1.41-18.43,0-18.43,0S164.58,113.64,158.91,71.1Z"
          className="fill-current"
        />
        <path 
          d="M235.23,237.72c-2.94,0-7-.18-12.76-.66l-1.65-.14-.72-1.49C217.72,230.49,161.69,114,156,71.48l-3.44-25.74,9,24.35c.51,1.36,51.13,137.09,81.36,161.83l2.48,2-2.27,2.27C242.59,236.83,241.7,237.72,235.23,237.72Zm-10.62-6.32c3.43.26,7.07.43,9.95.48-14.2-15.32-31.15-48.28-45.65-80.33C204.25,188.47,221,223.78,224.61,231.4Zm15.18.24Z"
          className="fill-current"
        />
      </svg>
    </div>
  )
} 