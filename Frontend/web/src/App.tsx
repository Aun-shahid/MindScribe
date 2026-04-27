import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingNew from './pages/LandingNew';
import Login from './pages/Login';
import Register from './pages/Register';
import RequestReset from './pages/RequestReset';
import ResetConfirm from './pages/ResetConfirm';
import PatientResetRedirect from './pages/PatientResetRedirect';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import SessionDetail from './pages/SessionDetail';
import SessionDetailView from './pages/SessionDetailView';
import ActiveSession from './pages/ActiveSession';
import SessionSOAP from './pages/SessionSOAP';
import Tools from './pages/Tools';
import ToolsSOAPList from './pages/ToolsSOAPList';
import ToolsEmotionalProfileList from './pages/ToolsEmotionalProfileList';
import SessionEmotionalProfile from './pages/SessionEmotionalProfile';
import EndSession from './pages/EndSession';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import PatientSessions from './pages/PatientSessions';
import Profile from './pages/Profile';
import QRCode from './pages/QRCode';
import NewSession from './pages/NewSession';
import NewPatient from './pages/NewPatient';
import SessionCalendar from './pages/SessionCalendar';
import Notifications from './pages/Notifications';
import PatientMoodAlert from './pages/PatientMoodAlert';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import HelpCenter from './pages/HelpCenter';
import './App.css';

const RedirectWithQuery = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingNew />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/request-reset" element={<RequestReset />} />
            <Route path="/reset-confirm" element={<ResetConfirm />} />
            <Route path="/patient/reset-password" element={<PatientResetRedirect />} />
            <Route path="/ResetConfirm" element={<RedirectWithQuery to="/reset-confirm" />} />
            <Route path="/resetconfirm" element={<RedirectWithQuery to="/reset-confirm" />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/help" element={<HelpCenter />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sessions" element={<Sessions />} />
                <Route path="/sessions/calendar" element={<SessionCalendar />} />
                <Route path="/sessions/new" element={<NewSession />} />
                <Route path="/sessions/:id" element={<SessionDetail />} />
                <Route path="/sessions/:id/view" element={<SessionDetailView />} />
                <Route path="/sessions/:id/active" element={<ActiveSession />} />
                <Route path="/sessions/:id/soap" element={<SessionSOAP />} />
                <Route path="/sessions/:id/end" element={<EndSession />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/tools/soap" element={<ToolsSOAPList />} />
                <Route path="/tools/emotional-profile" element={<ToolsEmotionalProfileList />} />
                <Route path="/tools/emotional-profile/:id" element={<SessionEmotionalProfile />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/patients/new" element={<NewPatient />} />
                <Route path="/patients/:patientId" element={<PatientDetail />} />
                <Route path="/patients/:patientId/mood" element={<PatientMoodAlert />} />
                <Route path="/patients/:patientId/sessions" element={<PatientSessions />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/qr-code" element={<QRCode />} />
                <Route path="/notifications" element={<Notifications />} />
                {/* <Route path="/" element={<Navigate to="/dashboard" replace />} /> */}
              </Route>
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
