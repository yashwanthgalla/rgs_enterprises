import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import httpClient from '../../../api/httpClient';
import { ENDPOINTS } from '../../../api/endpoints';

interface HubDeleteModalProps {
  hubId: number | string;
  hubCode: string;
  hubName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (releasedCode: string) => void;
}

export const HubDeleteModal: React.FC<HubDeleteModalProps> = ({
  hubId,
  hubCode,
  hubName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await httpClient.delete(ENDPOINTS.HUBS.DETAIL(hubId));
      const releasedCode = res.data?.releasedCode || hubCode;
      onSuccess(releasedCode);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.errors?.detail ||
        'Failed to decommission hub. Ensure you have administrator rights.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-apple-lg border border-[#E5E7EB] w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Decommission Hub</h3>
              <p className="text-xs text-[#6B7280]">{hubCode} &bull; {hubName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed font-medium">
            <strong>Warning:</strong> This code will be released and reassigned to the next new hub
            created in this state. All associated financial, staff, and asset history will be preserved
            under this facility's records.
          </div>

          <p className="text-xs text-[#4B5563]">
            Are you sure you want to deactivate and soft-delete <strong>{hubName} ({hubCode})</strong>?
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl border border-[#D1D5DB] text-[#4B5563] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Decommissioning...' : 'Confirm Decommission'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
