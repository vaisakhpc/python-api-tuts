import { cn } from "@/lib/utils";

interface InFolioLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function InFolioLogo({ className, size = "md" }: InFolioLogoProps) {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Portfolio folder background */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="absolute inset-0 text-primary-foreground"
      >
        {/* Folder shape */}
        <path
          d="M3 7V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V9C21 7.89543 20.1046 7 19 7H12L10 5H5C3.89543 5 3 5.89543 3 7Z"
          fill="currentColor"
          opacity="0.8"
        />
        
        {/* Growth chart line inside folder */}
        <path
          d="M7 15L9 13L11 14L13 11L15 12L17 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="1"
        />
        
        {/* Small chart points */}
        <circle cx="7" cy="15" r="1" fill="currentColor" />
        <circle cx="9" cy="13" r="1" fill="currentColor" />
        <circle cx="11" cy="14" r="1" fill="currentColor" />
        <circle cx="13" cy="11" r="1" fill="currentColor" />
        <circle cx="15" cy="12" r="1" fill="currentColor" />
        <circle cx="17" cy="9" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}
