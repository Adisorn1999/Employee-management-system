import { z } from "zod";

export const shiftIdSchema = z.object({
  id: z.string().uuid(),
});
