// app/register/page.js
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import seedLogo from "@/public/seedLogo.jpeg"; // Your logo
import { isValidPhoneNumberLength, formatPhoneNumber } from "@/lib/utils"; // Removed isDateExpired

// Import API functions
import {
  createUser,
  linkUserInterests,
  fetchUserByLibraryCard,
  // fetchUserByPhone, // No longer checking phone for uniqueness on register
} from "@/lib/noco-apis/users";
import { fetchAllBranches } from "@/lib/noco-apis/branches";
import { fetchAllInterests } from "@/lib/noco-apis/interests";

const AGREEMENT_CONDITIONS = [
  "I will borrow seeds for personal use only and will not sell or commercially distribute them.",
  "I understand that while many seeds are viable and labeled, germination is not guaranteed.",
  "I agree to use seeds in a responsible and ethical way that supports sustainability.",
  "If I am able, I will attempt to save seeds from my harvest and consider donating them back to the Seed Library.",
  "I will treat this as a shared community resource and respect the borrowing limits (e.g., 3 seed packets per month, as applicable).",
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Enter Card, 2: Display Form or "Already Registered" Message
  const [libraryCardInput, setLibraryCardInput] = useState("");

  const [existingNocoDbUser, setExistingNocoDbUser] = useState(null); // Store the fetched user if already registered

  const [form, setForm] = useState({
    FullName: "",
    LibraryCard: "",
    Phone: "",
    Email: "",
    PreferredContact: "Phone",
    GardeningExperience: "Not Specified",
    IsDonor: false,
    SignedAgreement: false,
    branches_id: "",
    Notes: "",
    SelectedInterestIds: [],
    Status: "New",
  });

  const [branches, setBranches] = useState([]);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function fetchDropdownData() {
      try {
        const [branchesData, interestsData] = await Promise.all([
          fetchAllBranches(),
          fetchAllInterests(),
        ]);
        setBranches(branchesData || []);
        setInterests(interestsData || []);
      } catch (err) {
        console.error("Failed to fetch dropdown data:", err);
        setPageError(
          "Could not load some form options. Refreshing might help."
        );
      }
    }
    fetchDropdownData();
  }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "Phone" && formError.includes("Phone")) setFormError(""); // Clear phone specific error

    if (name === "SelectedInterestIds") {
      const interestId = parseInt(value);
      setForm((prev) => ({
        ...prev,
        SelectedInterestIds: checked
          ? [...prev.SelectedInterestIds, interestId]
          : prev.SelectedInterestIds.filter((id) => id !== interestId),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleLibraryCardSubmit = async (e) => {
    e.preventDefault();
    setPageError("");
    if (!libraryCardInput.trim()) {
      setPageError("Please enter Library Card.");
      return;
    }
    if (
      libraryCardInput.trim().length !== 14 ||
      !libraryCardInput.trim().startsWith("293600")
    ) {
      setPageError(
        "Please use a Valid EPL card number. If you need one go to the Reference Desk."
      );
      return;
    }

    setLoading(true);
    setSuccessMessage("");
    setExistingNocoDbUser(null);

    try {
      const nocoUser = await fetchUserByLibraryCard(libraryCardInput.trim());
      if (nocoUser) {
        setExistingNocoDbUser(nocoUser);
        setStep(2);
      } else {
        // Card is valid format, not in NocoDB - proceed to form
        setForm((prevForm) => ({
          ...prevForm,
          LibraryCard: libraryCardInput.trim(),
          FullName: "",
          Phone: "",
          Email: "",
          IsDonor: false,
          SignedAgreement: false,
          RegisteredAtBranchId: "",
          Notes: "",
          SelectedInterestIds: [],
        }));
        setStep(2); // Move to form
      }
    } catch (err) {
      console.error("Lookup failed:", err);
      setPageError(err.message || "Error during card lookup.");
      setStep(1); // Stay on step 1 on error
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.FullName.trim()) {
      setFormError("Full Name is required.");
      return;
    }
    if (!form.SignedAgreement) {
      setFormError("Agreement to terms is required.");
      return;
    }
    if (!form.RegisteredAtBranchId) {
      setFormError("Please select library branch.");
      return;
    }

    let finalPhone = null;
    if (form.Phone.trim()) {
      // Only validate and format if phone is provided
      if (!isValidPhoneNumberLength(form.Phone)) {
        setFormError("If providing a Phone Number, it must be 10 digits.");
        return;
      }
      finalPhone = formatPhoneNumber(form.Phone);
      if (!finalPhone) {
        setFormError("Invalid phone number format provided.");
        return;
      }
    }

    setLoading(true);
    setSuccessMessage("");

    try {
      const branchId = parseInt(form.RegisteredAtBranchId);
      if (isNaN(branchId) || !branchId) {
        setFormError("Invalid Branch selection.");
        setLoading(false);
        return;
      }

      const userData = {
        FullName: form.FullName,
        LibraryCard: form.LibraryCard,
        Phone: finalPhone,
        Email: form.Email.trim() || "",
        PreferredContact: form.PreferredContact,
        GardeningExperience: form.GardeningExperience,
        IsDonor: form.IsDonor,
        SignedAgreement: form.SignedAgreement,
        Status: "New",
        Notes: form.Notes.trim() || "",
        branches_id: branchId,
      };

      // Remove null phone from payload if not provided, NocoDB might prefer omitted field
      if (!userData.Phone) delete userData.Phone;
      if (!userData.Email) delete userData.Email;
      if (!userData.Notes) delete userData.Notes;

      const newUserResponse = await createUser(userData);

      if (newUserResponse && newUserResponse.Id) {
        if (form.SelectedInterestIds.length > 0) {
          await linkUserInterests(newUserResponse.Id, form.SelectedInterestIds);
        }
        setSuccessMessage(
          `Welcome, ${userData.FullName}! Registration complete. Taking you to borrow seeds...`
        );

        setTimeout(() => {
          router.push(`/borrow?card=${encodeURIComponent(form.LibraryCard)}`);
        }, 3000);
      } else {
        throw new Error("User creation failed or didn't return expected ID.");
      }
    } catch (err) {
      console.error("Registration submission failed:", err);
      setFormError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setLibraryCardInput("");
    setPageError("");
    setFormError("");
    setSuccessMessage("");
    setExistingNocoDbUser(null);
    setForm({
      // Reset form to initial default values
      FullName: "",
      LibraryCard: "",
      Phone: "",
      Email: "",
      PreferredContact: "Phone",
      GardeningExperience: "NotSpecified",
      IsDonor: false,
      SignedAgreement: false,
      RegisteredAtBranchId: "",
      Notes: "",
      SelectedInterestIds: [],
      Status: "New",
    });
  };

  return (
    <main className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white p-6 md:p-10 lg:p-12 rounded-xl shadow-2xl">
        <div className="text-center mb-8 md:mb-12">
          <Image
            src={seedLogo}
            alt="Seed Library Logo"
            width={450}
            height={450}
            className="rounded-full mx-auto mb-4 md:mb-6"
            priority
          />
          <h1 className="text-3xl md:text-4xl font-bold text-black">
            Seed Library Registration
          </h1>
        </div>

        {/* Step 1: Enter Library Card */}
        {step === 1 && (
          <form onSubmit={handleLibraryCardSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="libraryCardInput"
                className="block text-lg md:text-xl font-medium text-gray-700 mb-1"
              >
                Enter Your Library Card Number
              </label>
              <input
                type="text"
                id="libraryCardInput"
                value={libraryCardInput}
                onChange={(e) => {
                  setLibraryCardInput(e.target.value);
                  setPageError("");
                }}
                className="w-full p-3 md:p-4 text-lg md:text-xl border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                required
                autoFocus
              />
            </div>
            {pageError && (
              <p className="text-red-600 text-md md:text-lg text-center">
                {pageError}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 md:py-4 text-lg md:text-xl font-semibold text-white bg-black rounded-xl shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full mt-3 md:mt-4 py-3 md:py-4 text-lg md:text-xl font-semibold text-green-dark border-2 border-green-medium rounded-xl shadow-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-dark transition"
            >
              Back to Home
            </button>
          </form>
        )}

        {/* Step 2: Display "Already Registered" Message OR Registration Form */}
        {step === 2 && (
          <div>
            {loading && (
              <p className="text-center text-lg md:text-xl text-gray-600">
                Loading...
              </p>
            )}

            {/* Case 1: User Already Registered */}
            {existingNocoDbUser && !loading && (
              <div className="text-center space-y-4 md:space-y-6">
                <svg
                  className="mx-auto h-12 w-12 md:h-16 md:w-16 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="text-xl md:text-2xl font-semibold text-green-dark">
                  Welcome back, {existingNocoDbUser.FullName}!
                </h2>
                <p className="text-md md:text-lg text-gray-700">
                  This Library Card (
                  <span className="font-medium">
                    {existingNocoDbUser.LibraryCard}
                  </span>
                  ) is already registered with the Seed Library.
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 md:gap-4 pt-2">
                  {/* Borrow Seeds Button - Primary Style */}
                  <button
                    onClick={() =>
                      router.push(
                        `/borrow?card=${encodeURIComponent(
                          existingNocoDbUser.LibraryCard
                        )}`
                      )
                    }
                    className="w-full sm:w-auto py-3 px-6 text-md md:text-lg font-semibold text-white bg-black rounded-xl shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  >
                    Borrow Seeds
                  </button>
                  {/* Donate Seeds Button - Secondary Style */}
                  <button
                    onClick={() => router.push("/donate")} // Assuming /donate is the route
                    className="w-full sm:w-auto py-3 px-6 text-md md:text-lg font-semibold text-green-dark border-2 border-green-medium rounded-xl shadow-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-dark transition"
                    disabled
                  >
                    Donate Seeds
                  </button>
                </div>
                {/* Register Another Card - Link Style or Subtle Button */}
                <button
                  onClick={resetFlow}
                  className="w-full sm:w-auto text-lg md:text-lg text-blue-600 hover:text-blue-800 underline pt-4 font-medium"
                >
                  Register another card
                </button>
              </div>
            )}

            {/* ... (Case 2: Page Error during initial card lookup - JSX unchanged from previous version) ... */}
            {pageError && !existingNocoDbUser && !loading && (
              <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
                <p className="font-semibold text-lg md:text-xl">
                  An Error Occurred:
                </p>
                <p className="text-md md:text-lg">{pageError}</p>
                <button
                  onClick={resetFlow}
                  className="mt-4 w-full text-center py-2 px-4 text-md md:text-lg font-medium text-white bg-black rounded-md hover:bg-gray-700"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Case 3: New User Registration Form - Ensure buttons here also match */}
            {!existingNocoDbUser &&
              !pageError &&
              !loading &&
              !successMessage && (
                <form
                  onSubmit={handleRegistrationSubmit}
                  className="space-y-5 md:space-y-6"
                >
                  <p className="text-lg md:text-xl text-gray-800 font-semibold border-b pb-2">
                    New Seed Library Member Registration
                  </p>
                  <p className="text-sm md:text-base text-gray-600">
                    Library Card:{" "}
                    <span className="font-medium">{form.LibraryCard}</span>{" "}
                    (Valid for registration)
                  </p>

                  {/* Full Name (Required) */}
                  <div>
                    <label
                      htmlFor="FullName"
                      className="block text-md md:text-lg font-medium text-gray-700 mb-1"
                    >
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="FullName"
                      id="FullName"
                      required
                      value={form.FullName}
                      onChange={handleFormChange}
                      className="w-full p-3 md:p-4 text-md md:text-lg border rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Phone (Optional) */}
                    <div>
                      <label
                        htmlFor="Phone"
                        className="block text-md md:text-lg font-medium text-gray-700 mb-1"
                      >
                        Phone Number{" "}
                        <span className="text-xs text-gray-500">
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="tel"
                        name="Phone"
                        id="Phone"
                        value={form.Phone}
                        onChange={handleFormChange}
                        className="w-full p-3 md:p-4 text-md md:text-lg border rounded-md focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., 5551234567"
                      />
                    </div>
                    {/* Email (Optional) */}
                    <div>
                      <label
                        htmlFor="Email"
                        className="block text-md md:text-lg font-medium text-gray-700 mb-1"
                      >
                        Email Address{" "}
                        <span className="text-xs text-gray-500">
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="email"
                        name="Email"
                        id="Email"
                        value={form.Email}
                        onChange={handleFormChange}
                        className="w-full p-3 md:p-4 text-md md:text-lg border rounded-md focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Preferred Contact (Required) */}
                  <div>
                    <label
                      htmlFor="PreferredContact"
                      className="block text-md md:text-lg font-medium text-gray-700 mb-1"
                    >
                      Preferred Contact
                    </label>
                    <select
                      name="PreferredContact"
                      id="PreferredContact"
                      required
                      value={form.PreferredContact}
                      onChange={handleFormChange}
                      className="w-full p-3 md:p-4 text-md md:text-lg border rounded-md bg-white focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="Phone">Phone</option>{" "}
                      <option value="Email">Email</option>{" "}
                      <option value="None">None</option>
                    </select>
                  </div>

                  {/* Gardening Experience (Required, default "Not Specified") */}
                  <div>
                    <label
                      htmlFor="GardeningExperience"
                      className="block text-md md:text-lg font-medium text-gray-700 mb-1"
                    >
                      Gardening Experience{" "}
                    </label>
                    <select
                      name="GardeningExperience"
                      id="GardeningExperience"
                      required
                      value={form.GardeningExperience}
                      onChange={handleFormChange}
                      className="w-full p-3 md:p-4 text-md md:text-lg border rounded-md bg-white focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="Not Specified">Not Specified</option>{" "}
                      <option value="Beginner">Beginner</option>{" "}
                      <option value="Intermediate">Intermediate</option>{" "}
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  {/* Branch Selection (Required) */}
                  <div>
                    <label
                      htmlFor="RegisteredAtBranchId"
                      className="block text-md md:text-lg font-medium text-gray-700 mb-1"
                    >
                      Register at Branch <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="RegisteredAtBranchId"
                      id="RegisteredAtBranchId"
                      required
                      value={form.RegisteredAtBranchId}
                      onChange={handleFormChange}
                      className="w-full p-3 md:p-4 text-md md:text-lg border rounded-md bg-white focus:ring-green-500 focus:border-green-500"
                      disabled={branches.length === 0}
                    >
                      <option value="">
                        {branches.length === 0
                          ? "Loading branches..."
                          : "Select a branch"}
                      </option>
                      {branches.map((branch) => (
                        <option key={branch.Id} value={branch.Id}>
                          {branch.BranchName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Interests (Optional) */}
                  {interests.length > 0 && (
                    <div>
                      <label className="block text-md md:text-lg font-medium text-gray-700 mb-2">
                        Gardening Interests{" "}
                        <span className="text-xs text-gray-500">
                          (Optional)
                        </span>
                      </label>
                      <div className="space-y-2 max-h-40 md:max-h-48 overflow-y-auto p-2 border rounded-md">
                        {interests.map((interest) => (
                          <label
                            key={interest.Id}
                            className="flex items-center space-x-3 p-1 md:p-2 hover:bg-gray-50 rounded-md"
                          >
                            <input
                              type="checkbox"
                              name="SelectedInterestIds"
                              value={interest.Id}
                              checked={form.SelectedInterestIds.includes(
                                interest.Id
                              )}
                              onChange={handleFormChange}
                              className="form-checkbox h-4 w-4 md:h-5 md:w-5 text-green-600 rounded"
                            />
                            <span className="text-gray-700 text-sm md:text-lg">
                              {interest.Title}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes (Optional) */}
                  <div>
                    <label
                      htmlFor="Notes"
                      className="block text-md md:text-lg font-medium text-gray-700 mb-1"
                    >
                      Notes{" "}
                      <span className="text-xs text-gray-500">(Optional)</span>
                    </label>
                    <textarea
                      name="Notes"
                      id="Notes"
                      rows="2"
                      value={form.Notes}
                      onChange={handleFormChange}
                      className="w-full p-3 md:p-4 text-md md:text-lg border rounded-md focus:ring-green-500 focus:border-green-500"
                    ></textarea>
                  </div>
                  <fieldset className="space-y-3 md:space-y-4 p-3 md:p-4 border border-gray-300 rounded-md bg-gray-50">
                    <legend className="text-lg md:text-xl font-semibold text-green-dark px-2 -mb-2">
                      Terms & Conditions
                    </legend>
                    <ul className="list-decimal list-inside space-y-2 text-sm md:text-base text-gray-700 px-2 py-1">
                      {AGREEMENT_CONDITIONS.map((condition, index) => (
                        <li key={index}>{condition}</li>
                      ))}
                    </ul>
                    <div className="flex items-start pt-2">
                      <input
                        id="IsDonor"
                        name="IsDonor"
                        type="checkbox"
                        checked={form.IsDonor}
                        onChange={handleFormChange}
                        className="mt-1 focus:ring-green-500 h-5 w-5 text-green-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="IsDonor"
                        className="ml-3 text-md md:text-lg font-medium text-gray-700"
                      >
                        I'm interested in donating seeds in the future.
                        (Optional)
                      </label>
                    </div>
                    <div className="flex items-start">
                      <input
                        id="SignedAgreement"
                        name="SignedAgreement"
                        type="checkbox"
                        required
                        checked={form.SignedAgreement}
                        onChange={handleFormChange}
                        className="mt-1 focus:ring-green-500 h-5 w-5 text-green-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="SignedAgreement"
                        className="ml-3 text-md md:text-lg font-medium text-gray-700"
                      >
                        I have read and agree to all the Seed Library terms and
                        conditions listed above.{" "}
                        <span className="text-red-500">*</span>
                      </label>
                    </div>
                  </fieldset>

                  {formError && (
                    <p className="text-red-600 text-md md:text-lg text-center">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !form.SignedAgreement}
                    className="w-full py-3 md:py-4 text-lg md:text-xl font-semibold text-white bg-black rounded-xl shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
                  >
                    {loading
                      ? "Completing Registration..."
                      : "Complete Registration"}
                  </button>
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="w-full mt-3 py-3 md:py-4 text-lg md:text-xl font-semibold text-green-dark border-2 border-green-medium rounded-xl shadow-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-dark transition"
                  >
                    Cancel / Start Over
                  </button>
                </form>
              )}

            {/* Success Message AFTER new registration */}
            {successMessage && !existingNocoDbUser && !loading && (
              <div className="mb-6 p-4 bg-green-100 text-green-700 border border-green-300 rounded-lg text-center">
                <p className="font-semibold text-lg md:text-xl">
                  Registration Complete!
                </p>
                <p className="text-md md:text-lg mt-2">{successMessage}</p>
                <button
                  onClick={resetFlow}
                  className="mt-3 py-2 px-5 text-md md:text-lg font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Register Another Person
                </button>
              </div>
            )}
            {/* ... (Fallback if no state matches - JSX unchanged) ... */}
          </div>
        )}
      </div>
    </main>
  );
}
