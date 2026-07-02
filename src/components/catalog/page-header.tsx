import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Consistent page header used across catalog / practice / playground / docs pages. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  accent = "from-indigo-500 to-violet-500",
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-3">
        {Icon && (
          <span className={cn("grid size-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md", accent)}>
            <Icon className="size-5.5" />
          </span>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </div>
      </div>
      {description && <p className="mt-3 max-w-3xl text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
