import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingNew from './pages/LandingNew';
import Login_new from './pages/Login_new';
import Register from './pages/Register';
import RequestReset from './pages/RequestReset';
import ResetConfirm from './pages/ResetConfirm';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import SessionDetail from './pages/SessionDetail';
import SessionDetailView from './pages/SessionDetailView';
import ActiveSession from './pages/ActiveSession';
import EndSession from './pages/EndSession';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Profile from './pages/Profile';
import QRCode from './pages/QRCode';
import NewSession from './pages/NewSession';
import NewPatient from './pages/NewPatient';
import SessionCalendar from './pages/SessionCalendar';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingNew />} />
            <Route path="/login" element={<Login_new />} />
            <Route path="/login_new" element={<Login_new />} />
            <Route path="/register" element={<Register />} />
            <Route path="/request-reset" element={<RequestReset />} />
            <Route path="/reset-confirm" element={<ResetConfirm />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            
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
                <Route path="/sessions/:id/end" element={<EndSession />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/patients/new" element={<NewPatient />} />
                <Route path="/patients/:patientId" element={<PatientDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/qr-code" element={<QRCode />} />
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
