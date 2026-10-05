import React, { useMemo } from "react";
import { CheckSquare, ListCheck, ExternalLink } from "lucide-react";

interface RichTaskDescriptionProps {
  content: string;
  onCheckboxToggle?: (newContent: string) => void;
  className?: string;
}

export function RichTaskDescription({
  content,
  onCheckboxToggle,
  className = "",
}: RichTaskDescriptionProps) {
  // Parse total checklist items and completed checklist items
  const checklistStats = useMemo(() => {
    if (!content) return { total: 0, completed: 0, percent: 0 };
    const matches = content.match(/[-*+]\s+\[([ xX])\]/g) || [];
    const total = matches.length;
    const completed = matches.filter((m) => /\[[xX]\]/.test(m)).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [content]);

  // Handle toggling of a checkbox at specific occurrence index
  const handleToggle = (targetIndex: number) => {
    if (!onCheckboxToggle || !content) return;

    let currentIndex = 0;
    const regex = /([-*+]\s+\[)([ xX])(\])/g;
    const updated = content.replace(regex, (match, prefix, checkChar, suffix) => {
      if (currentIndex === targetIndex) {
        currentIndex++;
        const newChar = checkChar.trim().toLowerCase() === "x" ? " " : "x";
        return `${prefix}${newChar}${suffix}`;
      }
      currentIndex++;
      return match;
    });

    onCheckboxToggle(updated);
  };

  // Helper to render inline markdown: bold, italic, inline code, links
  const renderInline = (text: string) => {
    // Split by markdown delimiters
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Pattern for inline code, bold, italic, links
    const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(remaining.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={keyIdx++}
            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-700"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={keyIdx++} className="font-bold text-slate-900">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(
          <em key={keyIdx++} className="italic text-slate-800">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
        const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          parts.push(
            <a
              key={keyIdx++}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-brand-600 underline hover:text-brand-800 font-medium"
            >
              <span>{linkMatch[1]}</span>
              <ExternalLink className="size-2.5 inline" />
            </a>
          );
        } else {
          parts.push(token);
        }
      } else {
        parts.push(token);
      }
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < remaining.length) {
      parts.push(remaining.substring(lastIndex));
    }

    return parts;
  };

  if (!content || !content.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
        <p className="text-xs italic text-slate-400">
          No description provided yet. Add rich notes, acceptance criteria, or interactive checklists (`- [ ]`).
        </p>
      </div>
    );
  }

  // Parse lines into blocks
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let checkboxGlobalIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block detection
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        blocks.push(
          <div
            key={`code-${i}`}
            className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100"
          >
            <code>{codeBlockBuffer.join("\n")}</code>
          </div>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push(
        <h3
          key={`h3-${i}`}
          className="mt-3 mb-1 text-xs font-bold uppercase tracking-wider text-slate-800"
        >
          {renderInline(line.replace(/^###\s+/, ""))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${i}`} className="mt-3.5 mb-1.5 text-sm font-bold text-slate-900">
          {renderInline(line.replace(/^##\s+/, ""))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1
          key={`h1-${i}`}
          className="mt-4 mb-2 border-b border-slate-100 pb-1 text-base font-extrabold text-slate-950"
        >
          {renderInline(line.replace(/^#\s+/, ""))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="my-1.5 rounded-r border-l-4 border-brand-500 bg-brand-50/40 px-3 py-1.5 text-xs italic text-slate-700"
        >
          {renderInline(line.replace(/^>\s+/, ""))}
        </blockquote>
      );
      continue;
    }

    // Interactive Checklist Item: - [ ] or - [x]
    const checkMatch = line.match(/^(\s*[-*+]\s+\[)([ xX])(\]\s+)(.*)$/);
    if (checkMatch) {
      const currentIdx = checkboxGlobalIndex++;
      const isChecked = checkMatch[2].toLowerCase() === "x";
      const itemText = checkMatch[4];

      blocks.push(
        <div
          key={`check-${i}`}
          className="my-1 flex items-start gap-2.5 rounded-md px-1 py-0.5 text-xs text-slate-700 hover:bg-slate-50 transition"
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => handleToggle(currentIdx)}
            disabled={!onCheckboxToggle}
            className="mt-0.5 size-4 cursor-pointer rounded border-slate-300 text-brand-600 accent-brand-600 focus:ring-brand-500 transition"
          />
          <span className={isChecked ? "text-slate-400 line-through" : "text-slate-800 font-medium"}>
            {renderInline(itemText)}
          </span>
        </div>
      );
      continue;
    }

    // Standard Bullet point: - item or * item
    if (/^\s*[-*+]\s+/.test(line)) {
      const itemText = line.replace(/^\s*[-*+]\s+/, "");
      blocks.push(
        <div key={`bullet-${i}`} className="my-0.5 flex items-start gap-2 text-xs text-slate-700">
          <span className="text-slate-400 font-bold">•</span>
          <span>{renderInline(itemText)}</span>
        </div>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      blocks.push(<div key={`space-${i}`} className="h-1.5" />);
      continue;
    }

    // Standard paragraph
    blocks.push(
      <p key={`p-${i}`} className="my-1 text-xs leading-relaxed text-slate-700">
        {renderInline(line)}
      </p>
    );
  }

  // Fallback if code block was not closed
  if (inCodeBlock && codeBlockBuffer.length > 0) {
    blocks.push(
      <div
        key="unclosed-code"
        className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100"
      >
        <code>{codeBlockBuffer.join("\n")}</code>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress pill if checklists are present */}
      {checklistStats.total > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2 text-xs font-medium text-brand-900">
          <div className="flex items-center gap-1.5">
            <ListCheck className="size-4 text-brand-600" />
            <span className="font-semibold">Interactive Checklist Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-700">
              {checklistStats.completed} of {checklistStats.total} done ({checklistStats.percent}%)
            </span>
            <div className="h-2 w-20 overflow-hidden rounded-full bg-brand-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-300"
                style={{ width: `${checklistStats.percent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Rendered Markdown Blocks */}
      <div className="text-xs text-slate-700 leading-relaxed">{blocks}</div>
    </div>
  );
}
