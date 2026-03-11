import { ApiResponse } from "../types";

export const successResponse = <T>(
  message: string,
  data?: T,
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
  };
};

export const errorResponse = (message: string, errors?: any): ApiResponse => {
  return {
    success: false,
    message,
    errors,
  };
};
