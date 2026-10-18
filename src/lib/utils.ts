import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/**
 * Cleans raw markdown characters (**, *, ###, >, ---, `) and semicolons (;) into clean, elegant text
 * ensuring there are no messy asterisks, semicolons, or raw formatting symbols.
 */
export function cleanOutputText(rawText: string): string {
  if (!rawText) return "";

  return rawText
    // Remove markdown headers: ### Heading or ## Heading -> Heading
    .replace(/^#{1,6}\s+/gm, "")
    // Remove markdown blockquote tags: > text -> text
    .replace(/^>\s*/gm, "")
    // Remove horizontal rules: --- or *** or ___
    .replace(/^(?:---|___|\*\*\*)\s*$/gm, "")
    // Replace markdown list asterisks, hyphens, and pluses with clean bullet symbol: * item -> • item
    .replace(/^\s*[\*\-\+]\s+/gm, "• ")
    // Strip bold & italic asterisks: **text** -> text, *text* -> text (without crossing newlines)
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    // Remove inline backticks: `code` -> code
    .replace(/`([^`\n]+)`/g, "$1")
    // Remove all remaining asterisks
    .replace(/\*/g, "")
    // Remove semicolons at end of lines or items: item; -> item
    .replace(/;\s*$/gm, "")
    // Replace remaining semicolons with comma or clean separation
    .replace(/;\s*/g, ", ")
    // Remove any remaining stray semicolons
    .replace(/;/g, "")
    // Clean redundant commas or multiple punctuation like ,, or ,. or trailing commas
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/,\s*$/gm, "")
    // Clean redundant multiple colons like :** or :*
    .replace(/:\s*(\*+)/g, ":")
    // Normalize excessive line breaks
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

