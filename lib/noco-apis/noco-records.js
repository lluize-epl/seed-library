const BASE_URL = process.env.NEXT_PUBLIC_NOCO_BASE_URL; // e.g., https://app.nocodb.com/api/v2/tables
const API_KEY = process.env.NEXT_PUBLIC_NOCO_API_KEY;

/**
 * Generic fetch wrapper for NocoDB API calls.
 * @param {string} tableId - The ID of the NocoDB table.
 * @param {string} path - The specific API path for the table (e.g., "/records", "/records/{recordId}").
 * @param {object} options - Fetch options (method, body, etc.).
 * @param {string} queryParams - Query parameters string (e.g., "?where=(Name,eq,Test)").
 * @returns {Promise<object|null>} The JSON response from NocoDB or null for no content.
 */
export async function nocoFetch(
  tableId,
  path = "/records",
  options = {},
  queryParams = ""
) {
  if (!API_KEY) {
    console.error("NocoDB API Key is not set in .env file.");
    throw new Error("Application configuration error: API Key missing.");
  }
  if (!BASE_URL) {
    console.error("NocoDB Base URL is not set in .env file.");
    throw new Error("Application configuration error: Base URL missing.");
  }

  const url = `${BASE_URL}/${tableId}${path}${queryParams}`;

  const headers = {
    "xc-token": API_KEY,
    accept: "application/json",
    "Content-Type": "application/json",
    ...options.headers, // Allow overriding or adding headers
  };

  // For POST, PATCH, PUT, ensure Content-Type if body exists

  if (
    options.body &&
    typeof options.body === "object" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  // transform object into JSON
  options.body = JSON.stringify(options.body);

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `Request failed with status ${
          response.statusText || response.status
        }`,
      }));
      console.error(
        `NocoDB API Error (${response.status}) on ${url}:`,
        errorData
      );
      // Try to extract a more specific error message if NocoDB provides one
      const specificMessage =
        errorData.msg || errorData.message || `NocoDB request failed`;
      throw new Error(`${specificMessage} (Status: ${response.status})`);
    }

    // Handle 204 No Content or empty response body
    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return null;
    }
    const data = response.json();

    return data;
  } catch (error) {
    console.error("Fetch operation error:", error);
    // Re-throw the error so it can be caught by the calling function
    // This allows page-level components to display user-friendly messages
    throw error;
  }
}
