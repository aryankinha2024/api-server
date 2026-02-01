import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  UserPlus,
  User,
  Users,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import socket from '../socket/index.js';

const GlobalSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [addingFriend, setAddingFriend] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Fetch all users from backend with pagination
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/users/all', {
          params: {
            page: currentPage,
            limit: usersPerPage
          }
        });
        
        if (response.data.success) {
          setAllUsers(response.data.users);
          setTotalPages(response.data.totalPages);
          setTotalUsers(response.data.total);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError(err.response?.data?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, usersPerPage]);


  useEffect(() => {
    // Ensure socket is connected
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        socket.auth = { token };
        socket.connect();
      }
    }

    // Listen for updates
    const handleOnlineUsers = (userIds) => {
      setOnlineUserIds(userIds);
    };

    const handleConnect = () => {
      socket.emit('online-users');
    };

    const handleDisconnect = () => {
      // console.log('Socket disconnected');
    };

    // Set up listeners
    socket.on('connect', handleConnect);
    socket.on('online-users', handleOnlineUsers);
    socket.on('disconnect', handleDisconnect);

    // If already connected, request immediately
    if (socket.connected) {
      socket.emit('online-users');
    }

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('online-users', handleOnlineUsers);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  // Get user initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if user is online (real-time from socket)
  const isUserOnline = (userId) => {
    return onlineUserIds.includes(userId);
  };

  // Get status color based on real-time online status
  const getStatusColor = (userId) => {
    return isUserOnline(userId) ? 'bg-green-500' : 'bg-gray-400';
  };

  // Filter users based on search (client-side for current page)
  const filteredUsers = allUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setSearchQuery('');
    }
  };

  // Handle users per page change
  const handleLimitChange = (newLimit) => {
    setUsersPerPage(newLimit);
    setCurrentPage(1); 
    setSearchQuery('');
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('...');
      }
      
      // Add pages around current page
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handleAddFriend = async (userId) => {
    setAddingFriend(userId);
    try {
      const response = await api.post('/friends/request', { recipientId: userId });
      
      if (response.data.message) {
        toast.success(response.data.message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send friend request';
      toast.error(errorMessage);
      console.error('Failed to send friend request:', err);
    } finally {
      setAddingFriend(null);
    }
  };

  // Calculate online count from real-time socket data
  const onlineCount = allUsers.filter(user => isUserOnline(user._id)).length;

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#fefefe] relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent-secondary px-8 py-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/30">
                <Globe className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Discover Users</h1>
                <p className="text-sm text-white/80 font-medium">
                  {totalUsers} total users • <span className="text-green-300">{onlineCount} online</span> • Page {currentPage} of {totalPages}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/30 shadow-lg">
              <Users className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-lg">{allUsers.length}</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border-2 border-transparent focus:border-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-gray-800 placeholder:text-gray-400 shadow-md font-medium"
            />
          </div>
        </div>

        {/* Users Grid */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8 pb-28">
          <div className="max-w-7xl mx-auto">
            
            {loading ? (
              <div className="text-center py-32">
                <div className="bg-white rounded-3xl p-12 inline-block shadow-2xl">
                  <Loader2 className="w-20 h-20 text-primary mx-auto mb-6 animate-spin" />
                  <p className="text-gray-600 text-xl font-semibold">Loading users...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-32">
                <div className="bg-white rounded-3xl p-12 inline-block shadow-2xl">
                  <User className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                  <p className="text-gray-700 text-xl font-bold mb-2">Failed to load users</p>
                  <p className="text-gray-500 text-sm mb-6">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-gradient-to-r from-primary to-accent-secondary text-white rounded-xl font-semibold hover:shadow-xl transition-all hover:scale-105"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-32">
                <div className="bg-white rounded-3xl p-12 inline-block shadow-2xl">
                  <User className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                  <p className="text-gray-700 text-xl font-bold mb-2">No users found</p>
                  <p className="text-gray-500 text-sm">Try a different search term</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredUsers.map(user => (
                  <div 
                    key={user._id}
                    className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-primary hover:shadow-lg transition-all duration-200 group"
                  >
                    {/* Avatar - Centered */}
                    <div className="flex flex-col items-center mb-5">
                      <div className="relative mb-3">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent-secondary flex items-center justify-center shadow-lg ring-4 ring-gray-100 group-hover:ring-primary/20 transition-all">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold text-2xl">
                              {getInitials(user.name)}
                            </span>
                          )}
                        </div>
                        {/* Status Indicator - Real-time */}
                        <div className={`absolute bottom-1 right-1 w-4 h-4 ${getStatusColor(user._id)} rounded-full border-3 border-white shadow-md`}></div>
                      </div>

                      {/* User Info - Centered */}
                      <h3 className="font-bold text-gray-800 text-lg mb-1 text-center truncate w-full px-2">
                        {user.name}
                      </h3>
                      <p className="text-sm text-gray-500 text-center truncate w-full px-2">{user.email}</p>
                    </div>

                    {/* Add Friend Button */}
                    <button
                      onClick={() => handleAddFriend(user._id)}
                      disabled={addingFriend === user._id}
                      className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                        addingFriend === user._id
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-primary to-accent-secondary text-white hover:shadow-md hover:scale-[1.02] active:scale-95'
                      }`}
                    >
                      {addingFriend === user._id ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-5 h-5" />
                          <span>Add Friend</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls - Sticky at Bottom of Global Section */}
        {!loading && !error && allUsers.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.08)] border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-8 py-4">
              <div className="flex items-center justify-between">
                {/* Users Per Page Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">Show:</span>
                  <select
                    value={usersPerPage}
                    onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer text-sm text-gray-700 bg-white hover:border-primary/50"
                  >
                    <option value={10}>10 users</option>
                    <option value={20}>20 users</option>
                    <option value={30}>30 users</option>
                    <option value={50}>50 users</option>
                    <option value={100}>100 users</option>
                  </select>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      currentPage === 1
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95'
                    }`}
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1.5 mx-3">
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400 text-sm">
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`min-w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                            currentPage === page
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    ))}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      currentPage === totalPages
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95'
                    }`}
                  >
                    Next
                  </button>
                </div>

                {/* Status Text */}
                <div className="text-xs text-gray-500">
                  Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default GlobalSection;