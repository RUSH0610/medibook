class ApiResponse {
  constructor(statusCode, data = null, message = "Success", meta = null) {
    this.statusCode = statusCode;
    this.success = statusCode >= 200 && statusCode < 400;
    this.message = message;
    this.data = data;
    if (meta) {
      this.meta = meta;
    }
  }
}

export default ApiResponse;
