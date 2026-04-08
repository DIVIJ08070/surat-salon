export interface ApiSuccessResponse {
  success: true;
  statusCode: number;
  message: string;
  data: object | null;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string | object;
  path: string;
  timestamp: string;
  statusCode: number;
}
