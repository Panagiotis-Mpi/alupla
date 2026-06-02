import type { CSSProperties } from "react";

type IconProps = {
  src: string;
  label?: string;
  size?: number;
  className?: string;
};

export default function Icon({ src, label, size = 18, className }: IconProps) {
  return (
    <span
      className={`ui-icon${className ? ` ${className}` : ""}`}
      style={{ "--icon-url": `url(${src})`, "--icon-size": `${size}px` } as CSSProperties}
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
