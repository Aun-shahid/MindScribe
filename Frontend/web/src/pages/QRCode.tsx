// src/pages/QRCode.tsx
import { useState, useEffect } from 'react';
import { useTherapistQRCode } from '../hooks/useTherapist';
import TherapistQRCode from '../components/TherapistQRCode';
import therapistService from '../services/therapist.service';
import type { ConnectionRequest } from '../types/therapist';
import { Check, X, UserPlus, Clock, Mail, Phone } from 'lucide-react';

const QRCode = () => {
  const { loading, error, therapistInfo, handleShare, handleRefresh } = useTherapistQRCode();
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectionRequests();
  }, []);

  const fetchConnectionRequests = async () => {
    try {
      setLoadingRequests(true);
      console.log('[QRCode] Fetching connection requests...');
      const requests = await therapistService.getConnectionRequests('pending');
      console.log('[QRCode] Received requests:', requests);
      console.log('[QRCode] Requests count:', requests?.length || 0);
      // Ensure we always set an array
      setConnectionRequests(Array.isArray(requests) ? requests : []);
    } catch (err) {
      console.error('[QRCode] Failed to fetch connection requests:', err);
      setConnectionRequests([]); // Set empty array on error
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);
      await therapistService.acceptConnectionRequest(requestId, { action: 'accept_new' });
      // Remove the accepted request from the list
      setConnectionRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err) {
      console.error('Failed to accept connection request:', err);
      alert('Failed to accept connection request. Please try again.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);
      await therapistService.rejectConnectionRequest(requestId);
      // Remove the rejected request from the list
      setConnectionRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err) {
      console.error('Failed to reject connection request:', err);
      alert('Failed to reject connection request. Please try again.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

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
            <div className="text-4xl font-bold text-[#431657] bg-blue-50 py-8 px-4 rounded-lg">
              {(therapistInfo as any).therapist_pin}
            </div>
            <TherapistQRCode value={(therapistInfo as any).therapist_pin?.toString() || ''} />
            <p className="text-gray-600 ">
              Share this PIN or QR code with your patients so they can connect to you through the MindScribe mobile app.
            </p>
            <button
              onClick={handleShare}
              className="btn-primary"
              style={{ backgroundColor: '#431657', color: '#fff' }}
            >
              Share PIN
            </button>
          </div>
        )}
      </div>

      {/* Connection Requests Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <UserPlus className="text-green-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Pending Connection Requests</h2>
          </div>
          {connectionRequests.length > 0 && (
            <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
              {connectionRequests.length} pending
            </span>
          )}
        </div>

        {loadingRequests ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
          </div>
        ) : !Array.isArray(connectionRequests) || connectionRequests.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg">No pending connection requests</p>
            <p className="text-gray-500 text-sm mt-2">
              When patients scan your QR code or enter your PIN, their requests will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {connectionRequests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <UserPlus className="text-green-600" size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.patient_name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Clock size={14} className="mr-1" />
                          {formatDate(request.requested_at)}
                        </div>
                      </div>
                    </div>

                    <div className="ml-15 space-y-1">
                      {request.patient_email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail size={14} className="mr-2 text-gray-400" />
                          {request.patient_email}
                        </div>
                      )}
                      {request.phone_number && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone size={14} className="mr-2 text-gray-400" />
                          {request.phone_number}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={processingRequestId === request.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingRequestId === request.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Accept</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={processingRequestId === request.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingRequestId === request.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <X size={16} />
                          <span>Reject</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCode;