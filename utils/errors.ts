export type HttpError = Error & {
  status?: number;
};

export function httpError(message: string, status: number): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}
