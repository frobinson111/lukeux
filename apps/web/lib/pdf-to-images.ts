/**
 * PDF to Images Conversion Utility
 * Converts PDF pages to images for visual analysis by LLMs
 */

export type PdfPageImage = {
  pageNumber: number;
  base64Data: string;
  width: number;
  height: number;
};

export type ConvertPdfOptions = {
  maxPages?: number; // Limit pages for token management (default: 5)
  scale?: number; // Rendering scale (default: 1.5)
};

/**
 * Converts a PDF buffer to an array of page images (server-side compatible)
 * Uses pdf-lib for basic extraction and sharp for image rendering
 */
export async function convertPdfToImages(
  pdfBase64: string,
  options?: ConvertPdfOptions
): Promise<PdfPageImage[]> {
  const { maxPages = 5, scale = 1.5 } = options || {};

  try {
    // Dynamic imports for server-side PDF handling
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.load(Buffer.from(pdfBase64, "base64"));
    const numPages = Math.min(pdf.getPageCount(), maxPages);
    const pages: PdfPageImage[] = [];

    // For server-side rendering, we use a simpler approach:
    // Extract each page as a separate PDF and convert to image
    for (let i = 0; i < numPages; i++) {
      const singlePageDoc = await PDFDocument.create();
      const [copiedPage] = await singlePageDoc.copyPages(pdf, [i]);
      singlePageDoc.addPage(copiedPage);

      const { width, height } = copiedPage.getSize();
      const pdfBytes = await singlePageDoc.save();

      // Convert PDF page to PNG using pdf2pic or similar
      // For now, we'll use a placeholder that works with the canvas API on client
      // On server, this needs pdf-poppler or similar native library
      try {
        const base64 = await renderPdfPageToImage(pdfBytes, {
          width: Math.round(width * scale),
          height: Math.round(height * scale)
        });

        pages.push({
          pageNumber: i + 1,
          base64Data: base64,
          width: Math.round(width * scale),
          height: Math.round(height * scale)
        });
      } catch (renderErr) {
        console.error(`Failed to render PDF page ${i + 1}:`, renderErr);
        // Continue with other pages
      }
    }

    return pages;
  } catch (err) {
    console.error("PDF conversion failed:", err);
    throw new Error("Failed to convert PDF to images");
  }
}

/**
 * Renders a single PDF page to a PNG image
 * Uses pdf-to-img library for server-side rendering
 */
async function renderPdfPageToImage(
  pdfBytes: Uint8Array,
  size: { width: number; height: number }
): Promise<string> {
  try {
    // Try using pdf-to-img for server-side rendering
    const { pdf } = await import("pdf-to-img");
    const document = await pdf(Buffer.from(pdfBytes), { scale: 2.0 });

    // Get first (and only) page
    for await (const image of document) {
      // image is a Buffer containing PNG data
      return image.toString("base64");
    }

    throw new Error("No pages rendered");
  } catch (err) {
    // Fallback: return a placeholder or throw
    console.error("PDF rendering error:", err);
    throw err;
  }
}

// Client-side PDF conversion is not used in server-side API routes
// If needed in the future, use the server-side convertPdfToImages function
