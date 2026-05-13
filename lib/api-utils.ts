import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard API response for success
 */
export function successResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Standard API response for errors
 */
export function errorResponse(message: string, status = 400, details?: any) {
  return NextResponse.json(
    { 
      error: message,
      ...(details ? { details } : {})
    }, 
    { status }
  );
}

/**
 * Handles validation errors from Zod
 */
export function validationErrorResponse(error: ZodError) {
  return errorResponse(
    "Validation failed", 
    400, 
    error.flatten().fieldErrors
  );
}

/**
 * Handles unauthorized access
 */
export function unauthorizedResponse() {
  return errorResponse("Unauthorized", 401);
}

/**
 * Handles forbidden access
 */
export function forbiddenResponse() {
  return errorResponse("Forbidden", 403);
}

/**
 * Handles server errors
 */
export function serverErrorResponse(error: unknown, message = "Internal server error") {
  console.error(message, error);
  return errorResponse(message, 500);
}
