import { z } from "zod";

export const attendanceIdSchema = z.object({
  id: z.string().uuid(),
});
