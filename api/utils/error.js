// we are creating this function to handle custom errors

// utils have functions that we generally use alot

export const errorHandler = (statusCode, message) => {
  const error = new Error();
  error.statusCode = statusCode;
  error.message = message;
  return error;
};
