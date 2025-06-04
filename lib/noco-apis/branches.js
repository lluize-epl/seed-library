import { nocoFetch } from "./noco-records";

// --- Branch Table Functions ---
export async function fetchAllBranches() {
  const tableId = process.env.NEXT_PUBLIC_NOCO_BRANCHES_TABLE_ID;
  if (!tableId) throw new Error("Branches Table ID not set.");
  const data = await nocoFetch(
    tableId,
    "/records",
    { method: "GET" },
    "?fields=Id,BranchName&limit=200"
  );
  return data && data.list ? data.list : [];
}
