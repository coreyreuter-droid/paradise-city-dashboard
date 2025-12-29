import { type ReactNode, type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: boolean;
  hover?: boolean;
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

export function Card({
  children,
  className = "",
  padding = "md",
  shadow = true,
  hover = false,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border border-slate-200 bg-white
        ${paddingStyles[padding]}
        ${shadow ? "shadow-sm" : ""}
        ${hover ? "transition-shadow hover:shadow-md" : ""}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={`mb-4 space-y-1 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  as: Component = "h3",
  className = "",
}: CardTitleProps) {
  return (
    <Component
      className={`text-sm font-semibold text-slate-900 sm:text-base ${className}`}
    >
      {children}
    </Component>
  );
}

export function CardDescription({ children, className = "" }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-slate-600 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div
      className={`mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
