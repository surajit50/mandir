import type { TextSchema } from "@pdfme/schemas/types";

/** Minimal pdfme text schema defaults for server-side PDF generation. */
export function textField(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<TextSchema> = {},
): TextSchema {
  return {
    name,
    type: "text",
    position: { x, y },
    width,
    height,
    rotate: 0,
    opacity: 1,
    readOnly: false,
    required: false,
    alignment: "left",
    verticalAlignment: "top",
    fontSize: 10,
    lineHeight: 1.2,
    characterSpacing: 0,
    fontColor: "#111111",
    backgroundColor: "",
    borderColor: "#000000",
    borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    textFormat: "plain",
    overflow: "visible",
    fontVariantFallback: "synthetic",
    strikethrough: false,
    underline: false,
    ...overrides,
  };
}
