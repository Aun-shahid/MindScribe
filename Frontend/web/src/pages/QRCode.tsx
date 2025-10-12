// src/pages/QRCode.tsx
import { useTherapistQRCode } from '../hooks/useTherapist';

const QRCode = () => {
  const { loading, error, therapistInfo, handleShare, handleRefresh } = useTherapistQRCode();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>Error loading QR code: {error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Patient Connection</h1>
        <button
          onClick={handleRefresh}
          className="btn-secondary"
        >
          Refresh
        </button>
      </div>

      <div className="card text-center">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Your Therapist PIN</h2>
        {therapistInfo && (
          <div className="space-y-4">
            <div className="text-4xl font-bold text-blue-600 bg-blue-50 py-8 px-4 rounded-lg">
              {(therapistInfo as any).therapist_pin}
            </div>
            <p className="text-gray-600">
              Share this PIN with your patients so they can connect to you through the MindScribe mobile app.
            </p>
            <button
              onClick={handleShare}
              className="btn-primary"
            >
              Share PIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCode;