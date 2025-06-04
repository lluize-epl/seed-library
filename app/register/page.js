// app/register/page.js
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import seedLogo from "@/public/seedLogo.jpeg";
import {
  isValidPhoneNumberLength,
  formatPhoneNumber,
  isDateExpired,
} from "@/lib/utils";

// Import API functions from your new structure
import {
  createUser,
  linkUserInterests,
  fetchUserByLibraryCard,
  fetchUserByPhone,
} from "@/lib/noco-apis/users";
import { fetchAllBranches } from "@/lib/noco-apis/branches";
import { fetchAllInterests } from "@/lib/noco-apis/interests";

// Mock Polaris API CALL
async function mockFetchPolarisUserData(libraryCard) {
  console.log(`MOCK: Calling Polaris for card: ${libraryCard}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      if (libraryCard === "POLARIS_VALID" || libraryCard === "29360000000000") {
        // Test card numbers
        resolve({
          FullName: "Patron From Polaris",
          Email: "polaris.patron@example.com",
          Phone: "555-555-5555",
          LibraryCardExpiration: "2025-12-31", // YYYY-MM-DD
          // Other data Polaris might provide
        });
      } else if (
        libraryCard === "POLARIS_EXPIRED" ||
        libraryCard === "29360000000001"
      ) {
        resolve({
          FullName: "Expired Polaris Patron",
          Email: "expired.patron@example.com",
          Phone: "555-555-5555",
          LibraryCardExpiration: "2020-01-01",
        });
      } else {
        resolve(null); // Simulate user not found in Polaris
      }
    }, 500); // Simulate network delay
  });
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Enter Card, 2: Process/Display Form or Message
  const [libraryCardInput, setLibraryCardInput] = useState("");
  const [polarisData, setPolarisData] = useState(null); // Data fetched from Polaris (mock)
  const [isNocoDbUserByCard, setIsNocoDbUserByCard] = useState(false); // Flag if user already in our DB
  const [form, setForm] = useState({
    FullName: "",
    LibraryCard: 0,
    LibraryCardExpiration: "", // Store as YYYY-MM-DD for date input
    Phone: "",
    Email: "",
    PreferredContact: "Phone", // Default value
    GardeningExperience: "Not Specified", // Default value
    IsDonor: false,
    SignedAgreement: false,
    branches_id: 0,
    Notes: "",
    SelectedInterestIds: [],
  });

  const [branches, setBranches] = useState([]);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch branches and interests on component mount
  useEffect(() => {
    async function fetchDropdownData() {
      // No setLoading here as it's a background load, form can be used before this finishes
      try {
        const [branchesData, interestsData] = await Promise.all([
          fetchAllBranches(),
          fetchAllInterests(),
        ]);
        setBranches(branchesData || []);
        setInterests(interestsData || []);
      } catch (err) {
        console.error("Failed to fetch dropdown data:", err);
        // Set a non-blocking error, or just log it
        setPageError((prevError) =>
          prevError
            ? prevError + " Could not load some form options."
            : "Could not load some form options."
        );
      }
    }
    fetchDropdownData();
  }, []);

  // Handle Form Value changes
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

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
      setPageError("Please enter your Library Card number.");
      return;
    } else if (!libraryCardInput.trim().startsWith("293600")) {
      setPageError(
        "The numbered you entered is not a valid EPL card, please check with front desk"
      );
      return;
    }

    setLoading(true);
    setSuccessMessage("");
    setPolarisData(null);
    setIsNocoDbUserByCard(false);

    try {
      // Step A: Check NocoDB
      const existingNocoUser = await fetchUserByLibraryCard(
        libraryCardInput.trim()
      );
      if (existingNocoUser) {
        setIsNocoDbUserByCard(true);
        setSuccessMessage("You are already registered for the Seed Library!");
        setStep(2);
        setLoading(false);
        return;
      }

      // Step B: Call Polaris (Mock)
      const polarisPatron = await mockFetchPolarisUserData(
        libraryCardInput.trim()
      );
      if (polarisPatron) {
        setPolarisData(polarisPatron);
        // Pre-fill form state
        setForm((prevForm) => ({
          ...prevForm,
          FullName: polarisPatron.FullName || "",
          LibraryCard: libraryCardInput.trim(),
          LibraryCardExpiration: polarisPatron.LibraryCardExpiration || "",
          Phone: polarisPatron.Phone || "",
          Email: polarisPatron.Email || "",
          SignedAgreement: false, // Needs explicit agreement
          IsDonor: false,
          SelectedInterestIds: [],
          branches_id: "", // User needs to select this
        }));
        // Check if card from Polaris is expired

        if (polarisPatron.LibraryCardExpiration) {
          const cardExpiryDate = new Date(polarisPatron.LibraryCardExpiration);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (cardExpiryDate < today) {
            setPageError(
              "Your library card (according to library records) has expired. Please visit the reference desk to renew your card before registering for the Seed Library."
            );
            setPolarisData(null); // Don't proceed to form if card is expired
            setStep(2); // Still go to step 2 to show the pageError
            setLoading(false);
            return;
          }
        }
      } else {
        setPageError(
          "Invalid Library Card number or your details could not be found in the library system. Please check your card number or visit the reference desk."
        );
      }
      setStep(2);
    } catch (err) {
      console.error("Lookup failed:", err);
      setPageError(
        err.message || "An pageError occurred during lookup. Please try again."
      );
      setStep(2); // Show pageError on step 2
    } finally {
      setLoading(false);
    }
  };

  // Handle Form Submission
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.SignedAgreement) {
      setFormError(
        "You must agree to the terms and conditions to complete registration."
      );
      return;
    }
    if (!form.RegisteredAtBranchId) {
      setFormError("Please select your preferred library branch.");
      return;
    }

    if (!isValidPhoneNumberLength(form.Phone)) {
      setFormError("Phone number must be 10 digits.");
      setLoading(false); // Ensure loading is false if we return early
      return;
    }
    const formattedPhone = formatPhoneNumber(form.Phone);
    if (!formattedPhone) {
      // Should not happen if isValidPhoneNumberLength passed, but as a safeguard
      setPhoneError("Invalid phone number format.");
      setLoading(false);
      return;
    }

    // Add more client-side validation as needed

    setLoading(true);
    setSuccessMessage("");

    try {
      const existingUserByPhone = await fetchUserByPhone(formattedPhone);
      if (existingUserByPhone) {
        if (existingUserByPhone.LibraryCard !== form.LibraryCard) {
          setFormError(
            `This phone number (${formattedPhone}) is already associated with another Seed Library account. Please use a different phone number or check your details.`
          );
          setLoading(false);
          return;
        }
      }
      const branchId = parseInt(form.RegisteredAtBranchId);
      if (isNaN(branchId) || !branchId) {
        setFormError("Invalid Branch selection, Please select a branch.");
        setLoading(false);
        return;
      }
      const userData = {
        FullName: form.FullName,
        LibraryCard: form.LibraryCard, // This was set from libraryCardInput
        LibraryCardExpiration: form.LibraryCardExpiration,
        Phone: formattedPhone,
        Email: form.Email,
        PreferredContact: form.PreferredContact,
        GardeningExperience: form.GardeningExperience,
        IsDonor: form.IsDonor,
        SignedAgreement: form.SignedAgreement,
        Notes: form.Notes || `Registered at Branch id : ${branchId}`,
        branches_id: branchId,
      };

      const newUser = await createUser(userData);

      if (newUser && newUser.Id) {
        // createUser should return the new user object with Id
        if (form.SelectedInterestIds.length > 0) {
          await linkUserInterests(newUser.Id, form.SelectedInterestIds);
        }
        setSuccessMessage(
          `Welcome, ${newUser.FullName}! Registration complete. Redirecting to borrow page...`
        );
        setTimeout(() => {
          router.push(`/borrow?card=${encodeURIComponent(form.LibraryCard)}`);
        }, 2000);
      } else {
        throw new Error(
          "User creation failed or did not return expected data."
        );
      }
    } catch (err) {
      console.error("Registration submission failed:", err);
      setFormError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset everything
  const resetFlow = () => {
    setStep(1);
    setLibraryCardInput("");
    setPageError("");
    setFormError("");
    setSuccessMessage("");
    setPolarisData(null);
    setIsNocoDbUserByCard(false);
    // Reset form to initial state
    setForm({
      FullName: "",
      LibraryCard: "",
      LibraryCardExpiration: "",
      Phone: "",
      Email: "",
      PreferredContact: "Phone",
      GardeningExperience: "Not Specified",
      IsDonor: false,
      SignedAgreement: false,
      RegisteredAtBranchId: "",
      Notes: "",
      SelectedInterestIds: [],
      branches_id: 0,
    });
  };

  // --- UI Elements for Senior Audience ---
  // Large fonts, clear labels, good contrast, simple inputs.

  return (
    <main className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white p-12 sm:p-6 rounded-xl shadow-2xl">
        <div className="text-center mb-12">
          <Image
            src={seedLogo}
            alt="Logo"
            width={450}
            className="rounded-full mx-auto mb-8"
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
                className="block text-xl font-medium text-gray-700 mb-1"
              >
                Enter Your Library Card Number
              </label>
              <input
                type="text"
                id="libraryCardInput"
                value={libraryCardInput}
                onChange={(e) => setLibraryCardInput(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-lg mb-6"
                placeholder="Library Card Number"
                required
              />
            </div>
            {pageError && <p className="text-red-600 text-md">{pageError}</p>}{" "}
            {/* Error for this step */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-xl font-semibold text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Continue"}
            </button>
            <button
              type="button"
              className="w-full mt-4 py-3 rounded-xl text-xl font-semibold text-green-dark border-2 border-green-medium hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-dark focus:ring-offset-2 transition text-center block"
              onClick={() => router.push("/")}
            >
              Back to Home
            </button>
          </form>
        )}

        {/* Step 2: Display results or simplified form */}
        {step === 2 && (
          <div>
            {loading && (
              <p className="text-center text-lg text-gray-600">
                Loading details...
              </p>
            )}

            {/* Error Display for Step 2 lookup/Polaris issues */}
            {pageError &&
              !loading && ( // Show general pageError if not specific to form submission
                <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
                  <p className="font-semibold text-xl">Verification Issue:</p>
                  <p className="text-lg">{pageError}</p>
                  <button
                    onClick={resetFlow}
                    className="mt-4 w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-black hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  >
                    Try a different card
                  </button>
                </div>
              )}

            {/* Success Message (Already Registered or Registration Complete) */}
            {successMessage && !loading && (
              <div className="mb-6 p-4 bg-green-100 text-green-700 border border-green-300 rounded-lg text-center">
                <p className="font-semibold text-xl">Notice</p>
                <p className="text-lg mt-2">{successMessage}</p>
                {!isNocoDbUserByCard /* Show Start Over only if it wasn't "already registered" */ && (
                  <button
                    onClick={resetFlow}
                    className="mt-3 py-2 px-5 text-md md:text-lg font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Start Over
                  </button>
                )}
              </div>
            )}

            {/* Simplified Registration Form (if not NocoDB user, Polaris data exists, and no major pageError/success) */}
            {!isNocoDbUserByCard &&
              polarisData &&
              !successMessage &&
              !pageError &&
              !loading && (
                <form onSubmit={handleRegistrationSubmit} className="space-y-6">
                  <p className="text-lg text-gray-700 mb-4">
                    Welcome,{" "}
                    <span className="font-semibold">
                      {form.FullName || "Valued Patron"}
                    </span>
                    ! Some of your information has been pre-filled. Please
                    complete the remaining details to join the Seed Library.
                  </p>

                  {/* ----- Fields to confirm/fill ----- */}
                  {/* Name (pre-filled, read-only or confirmable) */}
                  <fieldset className="space-y-4 p-4 border border-gray-200 rounded-md">
                    <legend className="text-xl font-semibold text-green-dark px-2">
                      Your Information (from Library Records)
                    </legend>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Full Name
                      </label>
                      <p className="text-lg p-3 bg-gray-100 border border-gray-200 rounded-md">
                        {form.FullName}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">
                          Library Card
                        </label>
                        <p className="text-lg p-3 bg-gray-100 border border-gray-200 rounded-md">
                          {form.LibraryCard}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">
                          Card Expiration
                        </label>
                        <p className="text-lg p-3 bg-gray-100 border border-gray-200 rounded-md">
                          {form.LibraryCardExpiration
                            ? new Date(
                                form.LibraryCardExpiration
                              ).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    {/* Phone and Email might be editable if Polaris data is just a suggestion */}
                    <div>
                      <label
                        htmlFor="Phone"
                        className="block text-md md:text-lg font-medium text-gray-700 mb-1"
                      >
                        Phone (Confirm/Update){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="Phone"
                        id="Phone"
                        required
                        value={form.Phone}
                        onChange={handleFormChange}
                        className="w-full p-3 md:p-4 text-md md:text-lg border rounded-md focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g., 5551234567"
                      />
                      {formError.includes(
                        "Phone"
                      ) /* More specific error check */ && (
                        <p className="text-red-500 text-sm mt-1">{formError}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="Email"
                        className="block text-lg font-medium text-gray-700 mb-1"
                      >
                        Email Address (Confirm or Update)
                      </label>
                      <input
                        type="email"
                        name="Email"
                        id="Email"
                        value={form.Email}
                        onChange={handleFormChange}
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-lg"
                      />
                    </div>
                  </fieldset>

                  {/* Fields user MUST fill: PreferredContact, GardeningExperience, RegisteredAtBranchId, Agreements, Interests (optional) */}
                  <fieldset className="space-y-4 p-4 border border-gray-200 rounded-md">
                    <legend className="text-xl font-semibold text-green-dark px-2">
                      Seed Library Profile
                    </legend>
                    {/* Preferred Contact */}
                    <div>
                      <label
                        htmlFor="PreferredContact"
                        className="block text-lg font-medium text-gray-700 mb-1"
                      >
                        Preferred Contact Method{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="PreferredContact"
                        id="PreferredContact"
                        required
                        value={form.PreferredContact}
                        onChange={handleFormChange}
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-lg bg-white"
                      >
                        <option value="Phone">Phone</option>
                        <option value="Email">Email</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                    {/* Gardening Experience */}
                    <div>
                      <label
                        htmlFor="GardeningExperience"
                        className="block text-lg font-medium text-gray-700 mb-1"
                      >
                        Gardening Experience{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="GardeningExperience"
                        id="GardeningExperience"
                        value={form.GardeningExperience}
                        onChange={handleFormChange}
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-lg bg-white"
                      >
                        <option value="Not Specified">Not Specified</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                    {/* Branch Selection */}
                    <div>
                      <label
                        htmlFor="RegisteredAtBranchId"
                        className="block text-lg font-medium text-gray-700 mb-1"
                      >
                        Select Your Library Branch{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="RegisteredAtBranchId"
                        id="RegisteredAtBranchId"
                        required
                        value={form.RegisteredAtBranchId}
                        onChange={handleFormChange}
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-lg bg-white"
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
                    {/* Interests */}
                    {interests.length > 0 && (
                      <div>
                        <label className="block text-lg font-medium text-gray-700 mb-2">
                          Gardening Interests (Optional)
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-md">
                          {interests.map((interest) => (
                            <label
                              key={interest.Id}
                              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md"
                            >
                              <input
                                type="checkbox"
                                name="SelectedInterestIds"
                                value={interest.Id}
                                checked={form.SelectedInterestIds.includes(
                                  interest.Id
                                )}
                                onChange={handleFormChange}
                                className="form-checkbox h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                              />
                              <span className="text-gray-700 text-lg">
                                {interest.Title}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </fieldset>
                  {/* Agreement Section - same as before */}
                  <fieldset className="space-y-4 p-4 border border-gray-200 rounded-md">
                    <legend className="text-xl font-semibold text-green-dark px-2">
                      Agreement
                    </legend>
                    <div className="flex items-start">
                      <input
                        id="IsDonor"
                        name="IsDonor"
                        type="checkbox"
                        checked={form.IsDonor}
                        onChange={handleFormChange}
                        className="focus:ring-green-500 h-5 w-5 text-green-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="IsDonor"
                        className="ml-3 text-lg font-medium text-gray-700"
                      >
                        I'm interested in donating seeds in the future.
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
                        className="focus:ring-green-500 h-5 w-5 text-green-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="SignedAgreement"
                        className="ml-3 text-lg font-medium text-gray-700"
                      >
                        I agree to the Seed Library terms and conditions.{" "}
                        <span className="text-red-500">*</span>
                      </label>
                    </div>
                  </fieldset>

                  {/* Error for form submission */}
                  {formError &&
                    !formError.includes("Phone") /* General form error */ && (
                      <p className="text-red-600 text-md md:text-lg text-center">
                        {formError}
                      </p>
                    )}

                  <button
                    type="submit"
                    disabled={loading || !form.SignedAgreement}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-xl font-semibold text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
                  >
                    {loading
                      ? "Completing Registration..."
                      : "Complete Registration"}
                  </button>
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="mt-4 w-full text-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-lg font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel / Start Over
                  </button>
                </form>
              )}

            {/* Fallback if no specific state matches but step is 2 (should be covered by above) */}
            {step === 2 &&
              !loading &&
              !pageError &&
              !successMessage &&
              !polarisData &&
              !isNocoDbUserByCard && (
                <div className="text-center">
                  <p className="text-lg text-gray-600">
                    Please enter your library card number to begin.
                  </p>
                  <button
                    onClick={resetFlow}
                    className="mt-4 w-auto mx-auto py-2 px-6 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Enter Library Card
                  </button>
                </div>
              )}
          </div>
        )}
      </div>
    </main>
  );
}
