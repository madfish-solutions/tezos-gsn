import http from "http";
import express from "express";

export const prodErrorHandler: express.ErrorRequestHandler = (
  err,
  _req,
  res,
  _next // eslint-disable-line
) => {
  const code = err.code || err.status || 500;
  const codeMessage = http.STATUS_CODES[code];

  res.statusCode = code;
  res.end(
    code === 500 && process.env.NODE_ENV === "production"
      ? codeMessage
      : (err.length && err) || err.message || codeMessage
  );
};
