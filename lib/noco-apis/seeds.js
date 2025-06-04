import { nocoFetch } from "./noco-records";

export async function fetchAllSeedDetails() {
  /* This function returns
  {
  "list": [
    {
      "Id": 1,
      "SeedType": "Basil",
      "SeedName": "Red Rubi",
      "Description": null,
      "GrowingInstructions": null,
      "ImageUrl": null,
      "DaysToMaturity": null,
      "SunExposure": null,
      "Users_id": null,
      "CreatedAt": "2025-05-19 20:20:08+00:00",
      "UpdatedAt": "2025-05-29 20:17:59+00:00",
      "SeedQuantity": [
        1, 
        3,
        2,
        0
      ],
      "SeedAvailableAt": [
        {
          "Id": 35,
          "BranchName": "CB"
        },
        {
          "Id": 67,
          "BranchName": "Bookmobile"
        },
        {
          "Id": 1,
          "BranchName": "Main"
        },
        {
          "Id": 34,
          "BranchName": "North"
        }
      ]
      "BorrowTransactions": 1,
      "SeedInventories": 4,
      "DonatedByUserId": null
    },...
  }
    SeedQuantity[0] refers to SeedAvailableAt[0]
    So there is {1} available seed at {CB}
    */

  const tableId = process.env.NEXT_PUBLIC_NOCO_SEEDS_TABLE_ID;
  if (!tableId)
    throw new Error(
      "Seeds Table ID (NEXT_PUBLIC_NOCO_SEEDS_TABLE_ID) not set."
    );

  const data = await nocoFetch(
    tableId,
    "/records",
    { method: "GET" },
    queryParams
  );
  return data && data.list ? data.list : [];
}

export async function fetchSeedDetailsByIds(seedIds = []) {
  const tableId = process.env.NEXT_PUBLIC_NOCO_SEEDS_TABLE_ID;
  if (!tableId) throw new Error("Seeds Table ID not set.");
  if (!seedIds || seedIds.length === 0) return [];

  // NocoDB 'where in' query: (FieldName,in,value1,value2)
  const queryParams = `?where=(Id,in,${seedIds.join(",")})&limit=1000`;
  const data = await nocoFetch(
    tableId,
    "/records",
    { method: "GET" },
    queryParams
  );
  return data && data.list ? data.list : [];
}

export async function createSeed(seedData) {
  const tableId = process.env.NEXT_PUBLIC_NOCO_SEEDS_TABLE_ID;
  if (!tableId) throw new Error("Seeds Table ID not set.");
  return nocoFetch(tableId, "/records", { method: "POST", body: seedData });
}
