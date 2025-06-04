import { updateRecordLink } from "./noco-links";
import { nocoFetch } from "./noco-records";

export async function fetchUserByLibraryCard(libraryCard) {
  /* Returns
  {
  "list": [
    {
      "Id": 1,
      "FullName": "Lucas Santos Luize",
      "LibraryCard": 29360002954670,
      "Phone": "973-855-9977",
      "Email": "lluize@edisonpubliclibrary.org",
      "PreferredContact": "Email",
      "GardeningExperience": "Beginner",
      "SignedAgreement": true,
      "IsDonor": true,
      "LibraryCardExpiration": "2028-02-24",
      "branches_id": 1,
      "Notes": null,
      "CreatedAt": "2025-05-19 20:46:49+00:00",
      "UpdatedAt": "2025-05-29 17:29:00+00:00",
      "QuantityBorrowed": [
        1,
        1,
        1
      ],
      "TransactionDates": [
        "2025-05-29",
        "2025-05-23",
        "2025-05-19"
      ],
      "BorrowTransactions": 3,
      "DonatedSeeds": 0,
      "RegisteredAtBranch": {
        "Id": 1,
        "BranchName": "Main"
      },
      "_nc_m2m_User_Interests": [
        {
          "Interest_id": 3,
          "User_id": 1
        },
        {
          "Interest_id": 4,
          "User_id": 1
        }
      ],
      "UserInterests": 2,
      "SeedsBorrowed": [
        {
          "Id": 5,
          "SeedType": "Bell Pepper"
        },
        {
          "Id": 4,
          "SeedType": "Beet"
        },
        {
          "Id": 6,
          "SeedType": "Brocolli"
        }
      ],
      "BranchesBorrowed": [
        {
          "Id": 1,
          "BranchName": "Main"
        },
        {
          "Id": 1,
          "BranchName": "Main"
        },
        {
          "Id": 1,
          "BranchName": "Main"
        }
      ]
    }
  ],
  "pageInfo": {
    "totalRows": 1,
    "page": 1,
    "pageSize": 25,
    "isFirstPage": true,
    "isLastPage": true
  },
  "stats": {
    "dbQueryTime": "84.034"
  }
}
  */
  const tableId = process.env.NEXT_PUBLIC_NOCO_USERS_TABLE_ID;
  if (!tableId)
    throw new Error(
      "Users Table ID (NEXT_PUBLIC_NOCO_USERS_TABLE_ID) not set."
    );

  const queryParams = `?where=(LibraryCard,eq,${libraryCard.trim()})`;
  const data = await nocoFetch(
    tableId,
    "/records",
    { method: "GET" },
    queryParams
  );
  return data && data.list && data.list.length > 0 ? data.list[0] : null;
}

export async function createUser(userData) {
  /* user data:
  {
      "FullName": "Lucas Santos Luize",
      "LibraryCard": 29360002954670,
      "Phone": "973-855-9977",
      "Email": "lluize@edisonpubliclibrary.org",
      "PreferredContact": "Email",
      "GardeningExperience": "Beginner",
      "SignedAgreement": true,
      "IsDonor": true,
      "LibraryCardExpiration": "2028-02-24",
      "branches_id": 1
  }
      */

  const tableId = process.env.NEXT_PUBLIC_NOCO_USERS_TABLE_ID;
  if (!tableId) throw new Error("Users Table ID not set.");

  return nocoFetch(tableId, "/records", {
    method: "POST",
    body: userData, // nocoFetch will stringify
  });
}

export async function linkUserInterests(userId, interestIdsArray) {
  const usersTableId = process.env.NEXT_PUBLIC_NOCO_USERS_TABLE_ID;
  const userInterestsM2MLinkId =
    process.env.NEXT_PUBLIC_NOCO_USER_INTERESTS_LINK_USERS_ID;

  if (!usersTableId || !userInterestsM2MLinkId) {
    throw new Error("User or User-Interests M2M Link ID not configured.");
  }
  return await updateRecordLink(
    usersTableId,
    userId,
    userInterestsM2MLinkId,
    interestIdsArray
  );
}

export async function fetchUserByPhone(phone) {
  const tableId = process.env.NEXT_PUBLIC_NOCO_USERS_TABLE_ID;
  if (!tableId)
    throw new Error(
      "Users Table ID (NEXT_PUBLIC_NOCO_USERS_TABLE_ID) not set."
    );

  const queryParams = `?where=(Phone,eq,${phone.trim()})`;
  const data = await nocoFetch(
    tableId,
    "/records",
    { method: "GET" },
    queryParams
  );
  return data && data.list && data.list.length > 0 ? data.list[0] : null;
}
