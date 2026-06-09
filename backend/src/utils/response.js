const ok  = (res, data = {}, message = 'Success', code = 200) =>
  res.status(code).json({ success: true, message, data, timestamp: new Date().toISOString() });

const err = (res, message = 'Error', code = 500, errors = null) => {
  const body = { success: false, message, timestamp: new Date().toISOString() };
  if (errors) body.errors = errors;
  return res.status(code).json(body);
};

const paginated = (res, data, total, page, limit) =>
  res.status(200).json({
    success: true, data,
    pagination: {
      total, page: +page, limit: +limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
    },
    timestamp: new Date().toISOString(),
  });

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ok, err, paginated, wrap };
