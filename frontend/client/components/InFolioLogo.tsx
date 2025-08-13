import { cn } from "@/lib/utils";

interface InFolioLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Replace #0000ff below with your design system's primary blue HEX code if needed
export default function InFolioLogo({ className, size = "md" }: InFolioLogoProps) {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      style={{
        background: "rgba(255,255,255,0.0)", // fully transparent background for blending
        borderRadius: "0.4em"
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.7" // bolder line
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          display: "block"
        }}
      >
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
        <polyline points="16 7 22 7 22 13"></polyline>
      </svg>
    </div>
  );
}
