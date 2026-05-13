import { generate } from "@pdfme/generator";
import { text } from "@pdfme/schemas";
import { getDefaultFont, type Template } from "@pdfme/common";

export async function renderPdfmePdf(
  template: Template,
  inputs: Record<string, string>[],
  meta: { title: string; subject?: string },
): Promise<Uint8Array> {
  return generate({
    template,
    inputs,
    plugins: { text },
    options: {
      font: getDefaultFont(),
      title: meta.title,
      subject: meta.subject ?? meta.title,
    },
  });
}
