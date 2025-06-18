import { useState } from "react";
import toast from "react-hot-toast";

export function EditSeedQuantityForm({
  initialQuantity,
  itemToEdit,
  branchName,
  onApply,
  onCancel,
  toastId,
}) {
  const [currentQuantity, setCurrentQuantity] = useState(
    String(initialQuantity || "0")
  ); // Local state
  const [pin, setPin] = useState(""); // New state for PIN
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const handleApplyClick = async () => {
    const newQuantity = parseInt(currentQuantity, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast.error("Please enter a valid non-negative quantity.", {
        id: toastId,
      });
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
      onApply(newQuantity, pinResult.staffName);
      toast.dismiss(toastId);
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
      <h4 className="text-lg font-semibold text-gray-800 mb-1 text-center">
        Edit Seed Stock
      </h4>
      <p className="text-sm text-gray-600 mb-1 text-center">
        <span className="font-medium">{itemToEdit.seedName}</span> (
        {itemToEdit.seedType})
      </p>
      <p className="text-xs text-gray-500 mb-3 text-center">
        Branch: {branchName}
      </p>
      <div className="mb-3">
        <label
          htmlFor="seedQuantityEditToast"
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          New Quantity:
        </label>
        <input
          id="seedQuantityEditToast"
          type="number"
          value={currentQuantity}
          onChange={(e) => setCurrentQuantity(e.target.value)}
          min="0"
          className="w-full p-2 border border-gray-300 rounded-md text-sm mb-4"
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
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleApplyClick}
          disabled={isVerifyingPin}
          className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          {isVerifyingPin ? "Verifying..." : "Apply Change"}
        </button>
      </div>
    </div>
  );
}
