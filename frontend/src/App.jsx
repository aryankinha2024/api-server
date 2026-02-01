import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import ProtectedRoute from "./utils/ProtectedRoute";
import VerifyOtp from "./components/VerifyOtp";

function App() {

  return (
    <Router>
      <Toaster 
        position="top-center"
        toastOptions={{
          // Default options
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#3d3636',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          // Success toast style
          success: {
            iconTheme: {
              primary: '#fe795f',
              secondary: '#ffffff',
            },
            style: {
              border: '2px solid #fe795f',
            },
          },
          // Error toast style
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
            style: {
              border: '2px solid #ef4444',
            },
          },
        }}
      />
      <Routes>
        {/* Protected Route */}
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Default redirect - to chat if authenticated, login if not */}
        <Route path="/" element={<Login />} />

        <Route path="/verify-otp" element={<VerifyOtp />} />

      </Routes>
    </Router>
  );
}

export default App;
