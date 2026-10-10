class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = [], errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.errors = errors;
    this.code = this.errorCode = errorCode || (
      statusCode === 400 ? "BAD_REQUEST" :
      statusCode === 401 ? "UNAUTHORIZED" :
      statusCode === 403 ? "FORBIDDEN" :
      statusCode === 404 ? "NOT_FOUND" :
      statusCode === 409 ? "CONFLICT" :
      statusCode === 422 ? "VALIDATION_ERROR" :
      "INTERNAL_SERVER_ERROR"
    );
  }
}

export default ApiError;
