/**
 * Saffron-forward hex palette for pdfme (matches app --primary ~oklch hue 45).
 * PDF renderer does not use CSS variables; keep in sync with app/globals.css visually.
 */
export const PDF_SAFFRON = {
  /** Title / emphasis text on light saffron bands */
  ink: "#431407",
  /** Body on white */
  inkSoft: "#57534e",
  /** Muted labels (warm gray) */
  muted: "#78716c",
  /** Primary saffron / burnt orange */
  primary: "#c2410c",
  /** Brighter accent bars and rules */
  vivid: "#ea580c",
  /** Deep saffron-brown for small caps / section labels */
  deep: "#9a3412",
  /** Light wash panels */
  wash: "#fff7ed",
  mist: "#ffedd5",
  cream: "#fffbf5",
  /** Hairline / panel borders */
  border: "#fdba74",
  borderSoft: "#fed7aa",
} as const;
