"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, Copy, Download } from "lucide-react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import clike from "react-syntax-highlighter/dist/esm/languages/prism/clike";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import kotlin from "react-syntax-highlighter/dist/esm/languages/prism/kotlin";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import swift from "react-syntax-highlighter/dist/esm/languages/prism/swift";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, type Language } from "@/lib/engine/types";
import { downloadText } from "@/lib/utils";
import { useMounted } from "@/lib/hooks";
import { useLocale } from "@/lib/i18n";

SyntaxHighlighter.registerLanguage("c", c);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("clike", clike);
SyntaxHighlighter.registerLanguage("csharp", csharp);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("kotlin", kotlin);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("swift", swift);
SyntaxHighlighter.registerLanguage("typescript", typescript);

/** Multi-language implementation viewer with copy + download. */
export function CodeViewer({ code, slug }: { code: Record<Language, string>; slug: string }) {
  const { resolvedTheme } = useTheme();
  const { t } = useLocale();
  const mounted = useMounted();
  const available = LANGUAGES.filter((l) => code[l.id]?.trim());
  const [lang, setLang] = React.useState<Language>(
    available.find((l) => l.id === "python")?.id ?? available[0]?.id ?? "pseudocode",
  );
  const [copied, setCopied] = React.useState(false);

  const active = LANGUAGES.find((l) => l.id === lang) ?? LANGUAGES[0];
  const source = code[lang] ?? "";

  const copy = async () => {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <Select value={lang} onValueChange={(v) => setLang(v as Language)}>
          <SelectTrigger className="h-8 w-40 border-none bg-transparent shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {available.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ms-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={copy} aria-label={t("shell.copyCode")}>
            {copied ? <Check className="text-emerald-500" /> : <Copy />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => downloadText(`${slug}.${active.ext}`, source)}
            aria-label={t("shell.downloadCode")}
          >
            <Download />
          </Button>
        </div>
      </div>
      <SyntaxHighlighter
        language={active.prism}
        style={mounted && resolvedTheme === "light" ? oneLight : oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          fontSize: "0.8125rem",
          background: "transparent",
          maxHeight: 480,
        }}
        showLineNumbers
        lineNumberStyle={{ opacity: 0.35, minWidth: "2.25em" }}
      >
        {source}
      </SyntaxHighlighter>
    </div>
  );
}
