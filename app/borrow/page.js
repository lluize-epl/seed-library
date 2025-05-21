"use client";
import { useState } from "react";
import edisonLogo from "@/public/edison-logo.png";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function BorrowPage() {
  const [phoneNumber, setphoneNumber] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seed, setSeeds] = useState(null);
  const [selectedSeeds, setSelectedSeeds] = useState([]);
  const router = useRouter();

  async function fetchUserByphoneNumber(phoneNumber) {
    const url = `${process.env.NEXT_PUBLIC_NOCO_BASE_URL}/tables/${process.env.NEXT_PUBLIC_NOCO_USER_TABLE_ID}/records?where=(Phone,eq,${phoneNumber})`;

    const res = await fetch(url, {
      headers: {
        "xc-token": process.env.NEXT_PUBLIC_NOCO_API_KEY,
        accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Error fetching user");
      console.log(res);
    }
    const data = await res.json();
    // Return the first user, or null if not found
    return data.list && data.list.length > 0 ? data.list[0] : null;
  }

  async function fetchSeeds() {
    const url = `${process.env.NEXT_PUBLIC_NOCO_BASE_URL}/tables/${process.env.NEXT_PUBLIC_NOCO_SEED_TABLE_ID}/records?`;
    const res = await fetch(url, {
      headers: {
        "xc-token": process.env.NEXT_PUBLIC_NOCO_API_KEY,
        accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error("Error fetching seeds");
      console.log(res);
    }
    const data = await res.json();
    return data.list;
  }

  // Helper to get seed name by Id
  function getSeedName(seedId) {
    if (!seed) return `Seed ${seedId}`;
    const found = seed.find((s) => s.Id === seedId);
    return `${found?.Type},${found?.["Full name"]}`;
  }

  async function handleLookup(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUser(null);
    setSeeds(null);

    try {
      const foundUser = await fetchUserByphoneNumber(phoneNumber);
      const foundSeeds = await fetchSeeds();
      if (foundUser) setUser(foundUser);
      if (foundSeeds) setSeeds(foundSeeds);
      if (!foundUser && !foundSeeds) {
        setError("Failed to Fetch User/Seeds");
      }
    } catch (err) {
      setError("Failed to fetch user.");
    }
    setLoading(false);
  }

  // Simple update on checkbox change
  const handleSeedChange = (seedId) => {
    setSelectedSeeds((prev) =>
      prev.includes(seedId)
        ? prev.filter((id) => id !== seedId)
        : [...prev, seedId]
    );
  };

  function isWithinLastMonth(dateString) {
    if (!dateString) return false;
    const now = new Date();
    const date = new Date(dateString);
    const diff = now - date;
    return diff < 30 * 24 * 60 * 60 * 1000; // less than 30 days
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const previousSeeds = user._nc_m2m_User_Seeds
      ? user._nc_m2m_User_Seeds.map((s) => s.Seed_id)
      : [];
    const lastBorrowDate = user.UpdatedAt ? user.UpdatedAt.split(" ")[0] : null;
    const alreadyBorrowedRecently = isWithinLastMonth(lastBorrowDate);

    const totalSeedsThisMonth = selectedSeeds.length;

    if (alreadyBorrowedRecently && totalSeedsThisMonth >= 3) {
      alert("You may only borrow up to 3 seeds per month.");
      return;
    }
    if (!alreadyBorrowedRecently && totalSeedsThisMonth > 3) {
      alert("You may only borrow up to 3 seeds at a time.");
      return;
    }
    if (!selectedSeeds.length) {
      alert("Please select at least one seed.");
      return;
    }
    setLoading(true);
    const seedsToDelete = previousSeeds.filter(
      (id) => !selectedSeeds.includes(id)
    );
    const seedsToAdd = selectedSeeds; // This will replace current selection in NocoDB relation

    const linkUrl = `${process.env.NEXT_PUBLIC_NOCO_BASE_URL}/tables/${process.env.NEXT_PUBLIC_NOCO_USER_TABLE_ID}/links/${process.env.NEXT_PUBLIC_NOCO_SEED_LINK_ID}/records/${user.Id}`;

    try {
      const postRes = await fetch(linkUrl, {
        method: "POST",
        headers: {
          "xc-token": process.env.NEXT_PUBLIC_NOCO_API_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(seedsToAdd.map((id) => ({ Id: id }))),
      });

      if (postRes.ok || postRes.status === 201) {
        // 3. Delete any seeds the user *used* to have, but didn't reselect
        if (seedsToDelete.length > 0) {
          const deleteRes = await fetch(linkUrl, {
            method: "DELETE",
            headers: {
              "xc-token": process.env.NEXT_PUBLIC_NOCO_API_KEY,
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify(seedsToDelete.map((id) => ({ Id: id }))),
          });
        }
        alert("Your seeds have been updated!");
        router.push("/");
      } else {
        alert("Something went wrong updating your seeds.");
      }
    } catch (err) {
      console.log(err);
      alert("Error during submission.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-green-light flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <Image
          src={edisonLogo}
          alt="Edison Public Library Logo"
          width={200}
          height={200}
          className="rounded-full"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-green-dark text-center">
          Borrow More Seeds
        </h1>

        {!user ? (
          <form onSubmit={handleLookup} className="w-full flex flex-col gap-4">
            <label
              htmlFor="phoneNumber"
              className="text-lg font-semibold text-green-dark"
            >
              Phone Number
            </label>
            <input
              id="phoneNumber"
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setphoneNumber(e.target.value)}
              className="p-4 rounded-lg border-2 border-black text-lg"
              placeholder="Enter your phone number"
            />
            <button
              type="submit"
              className="w-full py-4 rounded-xl text-xl font-semibold bg-black text-white shadow-md"
              disabled={loading}
            >
              {loading ? "Looking up..." : "Find My Account"}
            </button>

            {error && <p className="text-red-600">{error}</p>}
          </form>
        ) : (
          <div className="w-full flex flex-col gap-4">
            <h2 className="text-xl font-bold text-green-dark mt-6">
              Welcome, {user["Full Name"]} !
            </h2>
            <p className="text-lg">&bull; Email: {user.Email}</p>
            <p className="text-lg">
              &bull; Library Card: {user["Library card"]}
            </p>
            <p className="text-lg mb-6">
              &bull; Last borrow: {user["UpdatedAt"].split(" ")[0]}
            </p>
            {user && (
              <div className="w-full">
                <label className="block text-lg font-semibold text-green-dark mb-2">
                  Previously Borrowed Seeds
                </label>
                <div className="flex flex-col gap-2 max-h-36 overflow-y-auto border border-green-medium rounded-md p-2 bg-white">
                  {user._nc_m2m_User_Seeds &&
                  user._nc_m2m_User_Seeds.length > 0 ? (
                    user._nc_m2m_User_Seeds.map((seedLink) => (
                      <div key={seedLink.Seed_id} className="text-lg">
                        {getSeedName(seedLink.Seed_id)}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-base">
                      No seeds previously borrowed.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---- Seeds & Interests Form ---- */}
            <form
              onSubmit={handleFormSubmit}
              className="flex flex-col gap-6 mt-4"
            >
              {/* Seeds */}
              <div>
                <label className="block text-lg font-semibold text-green-dark mb-2">
                  Seeds
                </label>
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto border border-green-medium rounded-md p-2 bg-white">
                  {seed &&
                    seed.map((seedOption) => (
                      <label
                        key={seedOption.Id}
                        className="flex items-center gap-2 text-lg"
                      >
                        <input
                          type="checkbox"
                          value={seedOption.Id}
                          checked={selectedSeeds.includes(seedOption.Id)}
                          onChange={() => handleSeedChange(seedOption.Id)}
                          className="w-5 h-5 accent-green-medium"
                        />
                        {seedOption["Full Name"] ||
                          seedOption["name"] ||
                          `${seedOption.Type}, ${seedOption["Full name"]}`}
                      </label>
                    ))}
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full mt-12 py-4 rounded-xl text-xl font-semibold bg-black text-white shadow-md"
              >
                Submit
              </button>
            </form>
            <button
              onClick={() => setUser(null)}
              className="w-full py-4 mx-auto m-8 rounded-xl text-xl font-semibold bg-white text-black ring-2 shadow-md"
            >
              Look up another account
            </button>
          </div>
        )}
        <button
          className="w-full py-4 rounded-xl text-xl font-semibold bg-white text-green-dark border-2 border-green-medium shadow-md focus:outline-none focus:ring-2 focus:ring-green-dark transition text-center block"
          onClick={() => router.push("/")}
        >
          Go back
        </button>
      </div>
    </main>
  );
}
