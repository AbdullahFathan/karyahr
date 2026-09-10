import { z } from "zod";

/**
 * JSON error body produced by the central Express error handler.
 */
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});
