import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api/axios';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');


      if (!accessToken) {
        try {
          const response = await api.post('/auth/refresh-token');
          const newAccessToken = response.data.accessToken;
          
          localStorage.setItem('accessToken', newAccessToken);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Authentication failed:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      } else {

        setIsAuthenticated(true);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }


  return children;
};

export default ProtectedRoute;
