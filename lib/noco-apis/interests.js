import { nocoFetch } from "./noco-records";

// --- Interests Table Functions ---
export async function fetchAllInterests() {
  const tableId = process.env.NEXT_PUBLIC_NOCO_INTERESTS_TABLE_ID;
  if (!tableId) throw new Error("Interests Table ID not set.");
  const data = await nocoFetch(
    tableId,
    "/records",
    { method: "GET" },
    "?fields=Id,Title&limit=200"
  );
  return data && data.list ? data.list : [];
}
