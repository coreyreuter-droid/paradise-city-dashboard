// lib/imageTypes.ts
// Centralized image type validation for upload endpoints
//
// SECURITY: SVG is explicitly NOT allowed because:
// - SVG files can contain <script> tags
// - SVG files can contain event handlers (onload, onclick, etc.)
// - Even when served as images, some contexts may execute scripts
// - Not worth the risk for a civic finance portal

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/**
 * Type guard to check if a MIME type is an allowed image type.
 * 
 * @param mime - The MIME type string to check
 * @returns true if the MIME type is allowed
 * 
 * @example
 * if (!isAllowedImageType(file.type)) {
 *   return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
 * }
 */
export function isAllowedImageType(mime: string): mime is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime);
}

/**
 * Get a human-readable error message for invalid file types.
 */
export function getImageTypeError(): string {
  return `Invalid file type. Only ${ALLOWED_IMAGE_TYPES.map(t => t.replace("image/", "").toUpperCase()).join(", ")} files are allowed.`;
}

/**
 * Maximum allowed file size in bytes (10MB).
 * Prevents storage abuse and keeps uploads manageable.
 */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Check if file size is within limits.
 * 
 * @param sizeInBytes - File size in bytes
 * @returns true if size is acceptable
 */
export function isAllowedImageSize(sizeInBytes: number): boolean {
  return sizeInBytes > 0 && sizeInBytes <= MAX_IMAGE_SIZE_BYTES;
}

/**
 * Get a human-readable error message for oversized files.
 */
export function getImageSizeError(): string {
  const maxMB = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
  return `File too large. Maximum size is ${maxMB}MB.`;
}
