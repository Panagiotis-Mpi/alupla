import type { CSSProperties } from "react";

type IconProps = {
  src: string;
  label?: string;
  size?: number;
  className?: string;
};

export default function Icon({ src, label, size = 18, className }: IconProps) {
  const iconStyle = {
    width: `${size}px`,
    height: `${size}px`,
    WebkitMask: `url("${src}") center / contain no-repeat`,
    mask: `url("${src}") center / contain no-repeat`,
  } as CSSProperties;

  return (
    <span
      className={`ui-icon${className ? ` ${className}` : ""}`}
      style={iconStyle}
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
