import { type ReactNode, type HTMLAttributes } from "react";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: "section" | "div" | "article";
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function Section({
  children,
  className = "",
  as: Component = "section",
  ...props
}: SectionProps) {
  return (
    <Component className={`space-y-4 ${className}`} {...props}>
      {children}
    </Component>
  );
}

export function SectionHeader({
  title,
  description,
  eyebrow,
  actions,
  className = "",
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </p>
        )}
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>
      {actions && (
        <div className="mt-2 flex flex-shrink-0 items-center gap-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default Section;

