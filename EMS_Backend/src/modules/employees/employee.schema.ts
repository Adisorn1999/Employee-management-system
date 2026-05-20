import { z } from "zod";

export const employeeIdSchema = z.object({
  id: z.string().uuid(),
});
