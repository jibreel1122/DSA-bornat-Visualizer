/** Replaces {name} placeholders. Unknown placeholders are left as-is. */
export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
