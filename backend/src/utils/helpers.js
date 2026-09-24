/** Small helpers shared across the API. */

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

export const paginate = (query) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(200, Math.max(1, Number(query.limit || 20)));
  return { page, limit, skip: (page - 1) * limit };
};

export const toDateOnly = (value) => {
  const d = new Date(value);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const round2 = (n) => Math.round(n * 100) / 100;
