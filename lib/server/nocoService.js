// /lib/server/nocoService.js

const NOCO_API_KEY = process.env.NOCO_API_KEY;
const NOCO_BASE_URL = process.env.NOCO_BASE_URL;

/**
 * Server-side NocoDB API fetch wrapper.
 * This function is intended to be used ONLY in server-side code (Next.js API Routes, Server Components, etc.).
 */
export async function serverNocoFetch(
  tableId,
  path = "/records",
  options = {},
  queryParams = ""
) {
  if (!NOCO_API_KEY || !NOCO_BASE_URL) {
    console.error(
      "SERVER FATAL: NocoDB API Key or Base URL is not set in environment variables."
    );
    // In a real app, you might have more sophisticated error reporting here.
    throw new Error("Server configuration error: NocoDB credentials missing.");
  }

  const url = `${NOCO_BASE_URL}/${tableId}${path}${queryParams}`;

  const headers = {
    "xc-token": NOCO_API_KEY,
    accept: "application/json",
    ...options.headers,
  };

  if (options.body && typeof options.body === "object") {
    if (!headers["Content-Type"]) {
      // Only set if not already specified
      headers["Content-Type"] = "application/json";
    }
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let errorData = {
        message: `NocoDB request failed with status ${response.status}`,
      };
      try {
        errorData = await response.json(); // Try to get more specific error from NocoDB
      } catch (e) {
        // NocoDB might not always return JSON on error, or response might be empty
        console.warn("Could not parse NocoDB error response as JSON.", e);
      }

      const nocoErrorMessage =
        errorData.msg ||
        (Array.isArray(errorData.message)
          ? errorData.message.join(", ")
          : errorData.message) ||
        `NocoDB request to ${url} failed.`;

      console.error(
        `NocoDB API Error (${response.status}) on ${url}:`,
        nocoErrorMessage,
        "Details:",
        errorData
      );

      const errorToThrow = new Error(nocoErrorMessage);
      errorToThrow.status = response.status;
      errorToThrow.details = errorData; // Attach full NocoDB error details if available
      throw errorToThrow;
    }

    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return null;
    }
    return response.json();
  } catch (error) {
    // If it's an error we constructed above, re-throw it
    if (error.status) {
      throw error;
    }
    // Otherwise, it's likely a network error or something before the fetch call completed
    console.error(
      `Network or other error during serverNocoFetch to ${url}:`,
      error
    );
    throw new Error(
      `Failed to communicate with NocoDB service: ${error.message}`
    );
  }
}
