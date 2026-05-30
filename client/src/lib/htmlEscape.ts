// Escapes a value for safe interpolation into print/PDF HTML strings.
// Prevents stored XSS when user-entered text (names, notes, descriptions)
// is rendered into a print window via document.write.
export function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}
