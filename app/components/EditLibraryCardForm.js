import toast from "react-hot-toast";
import { useState } from "react";

export function EditLibraryCardForm({
  initialValue,
  pickupFullName,
  onApply,
  onCancel,
  toastId,
}) {
  const [currentCardValue, setCurrentCardValue] = useState(
    String(initialValue || "")
  ); // Local state for this input
  const [pin, setPin] = useState(""); // New state for PIN
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const handleApplyClick = async () => {
    // Client-side validation before calling onApply
    if (
      !currentCardValue.trim() ||
      currentCardValue.trim().length !== 14 ||
      !currentCardValue.trim().startsWith("293600")
    ) {
      toast.error("Invalid Card: 14 digits, starts with 293600.", {
        id: toastId,
      }); // Use toastId to update existing if needed
      return;
    }
    if (!pin.trim()) {
      toast.error("Please enter your Staff PIN to apply changes.", {
        id: toastId,
      });
      return;
    }
    setIsVerifyingPin(true);
    try {
      const pinResponse = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const pinResult = await pinResponse.json();

      if (!pinResponse.ok || !pinResult.success) {
        toast.dismiss(toastId);
        toast.error(pinResult.error || "Invalid PIN.", { duration: 2000 });
        setIsVerifyingPin(false);
        return;
      }

      // PIN is valid, staffName is in pinResult.staffName
      console.log(
        `Client: PIN verified for ${pinResult.staffName}. Proceeding with Library Card update.`
      );
      // Now call the original onApply, passing the staffName for server-side logging of who made the change
      onApply(currentCardValue, pinResult.staffName);
      toast.dismiss(toastId); // Dismiss this confirmation toast
    } catch (error) {
      console.error("PIN verification or apply error:", error);
      toast.dismiss(toastId);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  return (
    <div className="flex flex-col p-3 w-full max-w-sm">
      <h4 className="text-lg font-semibold text-gray-800 mb-3 text-center">
        Edit Library Card
      </h4>
      <p className="text-xs text-gray-500 mb-1">For: {pickupFullName}</p>
      <div className="mb-3">
        <label
          htmlFor="editLibCard"
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          New Library Card:
        </label>
        <input
          id="editLibCard"
          type="text"
          value={currentCardValue} // Use local state
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            if (val.length <= 14) {
              setCurrentCardValue(val); // Update local state
            }
          }}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm mb-4"
          placeholder="14-digit card number"
          maxLength={14}
          autoFocus
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="staffPinCard"
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Staff PIN:
        </label>
        <input
          id="staffPinCard"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm"
          placeholder="Enter 4-digit PIN"
        />
      </div>
      <div className="w-full flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleApplyClick}
          disabled={isVerifyingPin}
          className="px-4 py-2 text-sm rounded-md border border-transparent bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:bg-indigo-400"
        >
          {isVerifyingPin ? "Verifying..." : "Apply Change"}
        </button>
      </div>
    </div>
  );
}
