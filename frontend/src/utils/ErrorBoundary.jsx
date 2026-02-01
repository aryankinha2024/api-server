import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught error:', error);
    console.error('Error Info:', errorInfo);
    
    // Check if it's a JSON parsing error
    const isJsonError = error.message.includes('JSON') || 
                       error.message.includes('undefined');
    
    this.setState({
      error,
      errorInfo,
    });

    // If it's a JSON error, clear corrupted localStorage
    if (isJsonError) {
      console.warn('Detected JSON parsing error - clearing user data');
      try {
        localStorage.removeItem('user');
      } catch (e) {
        console.error('Failed to clear localStorage:', e);
      }
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
    // Reload the page to get a fresh state
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const isJsonError = this.state.error?.message.includes('JSON') || 
                         this.state.error?.message.includes('undefined');

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              
              <h1 className="text-red-600 font-bold mb-2 text-2xl">
                {isJsonError ? 'Data Error' : 'Application Error'}
              </h1>
              
              <p className="text-gray-600 mb-6">
                {isJsonError 
                  ? 'Your session data is corrupted. Please log in again.' 
                  : 'Something went wrong. Please try again.'}
              </p>

              <details className="text-left bg-gray-100 p-4 rounded-lg mb-6">
                <summary className="cursor-pointer text-xs text-gray-500 font-medium">
                  🔍 Technical Details
                </summary>
                <pre className="bg-white p-3 rounded mt-2 text-[10px] overflow-auto max-h-32">
                  {this.state.error?.toString()}
                </pre>
              </details>

              <button 
                onClick={this.handleReset}
                className="w-full bg-primary text-white px-6 py-3 rounded-full hover:bg-primary/90 font-medium shadow-lg transition-all"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
