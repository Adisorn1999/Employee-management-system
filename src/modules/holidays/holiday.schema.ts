import { z } from "zod";

export const holidayIdSchema = z.object({
  id: z.string().uuid(),
});
