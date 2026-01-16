import Image from "next/image";

type LogoProps = {
  showTagline?: boolean;
  className?: string;
  size?: "default" | "compact";
};

const LOGO_SRC = "/tc%20simple%20banner%20logo.png";

const sizeClasses: Record<NonNullable<LogoProps["size"]>, string> = {
  default: "h-32 w-[32rem] sm:h-36 sm:w-[36rem]",
  compact: "h-[4.5rem] w-60 sm:h-20 sm:w-72",
};

export function Logo({ showTagline = false, className, size = "default" }: LogoProps) {
  return (
    <div className={`relative ${sizeClasses[size]} ${className ?? ""}`}>
      <Image
        src={LOGO_SRC}
        alt="TC Simple logo"
        fill
        className="object-contain object-left"
        priority
      />
      {showTagline ? (
        <span className="sr-only">Real Estate Transaction Services</span>
      ) : null}
    </div>
  );
}

