import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Activity } from 'lucide-react';

const Tools: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 -mt-6 -mx-8 px-8 pt-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tools</h1>
          <p className="text-gray-600 mt-2">Access clinical tools for completed sessions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/tools/soap"
            className="group bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="bg-purple-100 text-purple-700 p-3 rounded-lg">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                  SOAP Notes
                </h2>
                <p className="text-gray-600 mt-2">
                  Open completed sessions and view or edit generated SOAP notes.
                </p>
              </div>
            </div>
          </Link>

          <Link
            to="/tools/emotional-profile"
            className="group bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 text-blue-700 p-3 rounded-lg">
                <Activity size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                  Emotional Profile
                </h2>
                <p className="text-gray-600 mt-2">
                  View emotion trends over time for completed sessions.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Tools;
