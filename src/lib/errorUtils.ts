/**
 * Centralized error utility for mapping backend status codes to user-friendly messages.
 * This ensures that raw error codes are never displayed to the end-user.
 */

export const getFriendlyErrorMessage = (error: any): string => {
  // 1. Handle JSON parsing errors or browser-level errors
  const message = error.message || "";
  if (message.includes("Unexpected token") || message.includes("not valid JSON") || message.includes("JSON.parse")) {
    // If it's a 429 specifically but failed to parse JSON, return the rate limit message
    if (error.response?.status === 429) {
      return "Too many requests. Please wait a few minutes before trying again.";
    }
    // General parsing/network failure
    return "We encountered a temporary technical issue. Please try again in a moment.";
  }

  // 2. Handle network errors or cases where the response is missing
  if (!error.response) {
    if (error.message === 'Network Error') {
      return "Please check your internet connection and try again.";
    }
    return "We're having trouble connecting to our servers. Please try again later.";
  }

  const status = error.response.status;
  const backendMessage = error.response.data?.message || error.response.data?.error;

  // 2. Map status codes to refined, user-friendly messages
  switch (status) {
    case 400:
      return backendMessage || "Invalid request. Please check your information and try again.";
    
    case 401:
      return "Your session has expired or you're not authorized. Please log in again.";
    
    case 403:
      return "Access denied. You don't have the required permissions for this action.";
    
    case 404:
      return "We couldn't find what you were looking for.";
    
    case 422:
      return backendMessage || "Some of the information provided is incorrect. Please review and try again.";
    
    case 429:
      return "We've received too many requests from your side. Please wait a few minutes before trying again.";
    
    case 500:
    case 502:
    case 503:
    case 504:
      return "Our servers are having a momentary lapse. We're working on it!";
    
    default:
      return backendMessage || "An unexpected error occurred. Please try again later.";
  }
};
