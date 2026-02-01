import React, { useState, useEffect } from "react";
import { MessageCircle, Search, UserMinus, X } from "lucide-react";
import api from "../api/axios";
import socket from "../socket";

const FriendsSection = ({ onOpenChat }) => {
  const [activeTab, setActiveTab] = useState("pending");

  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [acceptedFriends, setAcceptedFriends] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalFriends, setTotalFriends] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const fetchPending = async () => {
    try {
      const res = await api.get("/friends/pending");
      setPendingRequests(res.data.requests || []);
    } catch (err) {
      console.error("Error fetching pending:", err);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const res = await api.get("/friends/sent");
      setSentRequests(res.data.requests || []);
    } catch (err) {
      console.error("Error fetching sent requests:", err);
    }
  };

  // FETCH FRIEND LIST (latest 5 by default, or search results)
  const fetchFriends = async (search = '') => {
    try {
      setIsSearching(search !== '');
      const res = await api.get("/friends/list", {
        params: search ? { search } : {}
      });
      setAcceptedFriends(res.data.friends || []);
      setTotalFriends(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

  // FETCH REJECTED REQUESTS
  const fetchRejected = async () => {
    try {
      const res = await api.get("/friends/rejected");
      setRejectedRequests(res.data.requests || []);
    } catch (err) {
      console.error("Error fetching rejected:", err);
    }
  };


  useEffect(() => {
    fetchPending();
    fetchSentRequests();
    fetchFriends();
    fetchRejected();
  }, []);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem("accessToken");
      if (token) {
        socket.auth = { token };
        socket.connect();
      }
    }

    const handleConnect = () => {
      socket.emit('online-users');
    };

    const handleOnlineUsers = (userIds) => {
      setOnlineUserIds(userIds);
    };

    socket.on("connect", handleConnect);

    socket.on("friend-request-received", () => {
      fetchPending();
    });

    socket.on("friend-request-accepted", () => {
      fetchFriends();
    });

    socket.on("online-users", handleOnlineUsers);

    if (socket.connected) {
      socket.emit('online-users');
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("friend-request-received");
      socket.off("friend-request-accepted");
      socket.off("online-users", handleOnlineUsers);
    };
  }, []);

  const isUserOnline = (id) => onlineUserIds.includes(id);


  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle search button click - search from backend
  const handleSearch = () => {
    if (searchQuery.trim()) {
      fetchFriends(searchQuery);
    } else {
      fetchFriends(); // Reset to latest 5
    }
  };

  // Handle search input enter key
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear search and reset to latest 5
  const handleClearSearch = () => {
    setSearchQuery('');
    fetchFriends();
  };


  const handleAccept = async (requesterId) => {
    try {
      await api.post("/friends/accept", { requesterId });
      fetchPending();
      fetchFriends();
    } catch (err) {
      console.error("Error accepting:", err);
    }
  };

  const handleReject = async (requesterId) => {
    try {
      await api.post("/friends/reject", { requesterId });
      fetchPending();
      fetchRejected();
    } catch (err) {
      console.error("Error rejecting:", err);
    }
  };


  const handleRemoveFriend = async (friendId) => {
    try {
      await api.post("/friends/remove", { friendId });
      fetchFriends();
    } catch (err) {
      console.error("Error removing friend:", err);
    }
  };

  const handleCancelRequest = async (recipientId) => {
    try {
      await api.post("/friends/cancel", { recipientId });
      fetchSentRequests();
    } catch (err) {
      console.error("Error cancelling request:", err);
    }
  };

  // Handle message button click - open chat with friend
  const handleMessageClick = async (friendId) => {
    try {
      // Get or create room with this friend
      const res = await api.get(`/rooms/with/${friendId}`);
      const room = res.data.room;
      
      // Call the parent callback to switch to chat tab and load this room
      if (onOpenChat) {
        onOpenChat(room);
      }
    } catch (err) {
      console.error("Error getting room:", err);
    }
  };

  return (
    <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-background-light">

      <div className="lg:col-span-2 flex flex-col gap-6">
        
        <h1 className="text-text-primary-dark text-4xl font-black">Friends</h1>

        <div className="flex border-b border-gray-200 gap-8">
          

          <button
            className={`pb-3 pt-2 border-b-[3px] ${
              activeTab === "pending"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-secondary-dark hover:text-primary"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            Pending Requests
            <span className="bg-primary text-white text-xs font-bold rounded-full h-5 w-5 inline-flex items-center justify-center ml-2">
              {pendingRequests.length}
            </span>
          </button>

          <button
            className={`pb-3 pt-2 border-b-[3px] ${
              activeTab === "sent"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-secondary-dark hover:text-primary"
            }`}
            onClick={() => setActiveTab("sent")}
          >
            Sent Requests
            <span className="bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 inline-flex items-center justify-center ml-2">
              {sentRequests.length}
            </span>
          </button>

          <button
            className={`pb-3 pt-2 border-b-[3px] ${
              activeTab === "accepted"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-secondary-dark hover:text-primary"
            }`}
            onClick={() => setActiveTab("accepted")}
          >
            Accepted
          </button>


          <button
            className={`pb-3 pt-2 border-b-[3px] ${
              activeTab === "rejected"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-secondary-dark hover:text-primary"
            }`}
            onClick={() => setActiveTab("rejected")}
          >
            Rejected
          </button>
        </div>

        {activeTab === "pending" && (
          <div className="flex flex-col divide-y divide-gray-200">
            {pendingRequests.length === 0 && (
              <p className="py-10 text-center text-gray-500">No pending requests</p>
            )}

            {pendingRequests.map((req) => (
              <div key={req._id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent-secondary flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                    {req.requester.avatar ? (
                      <img
                        src={req.requester.avatar}
                        alt={req.requester.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(req.requester.name)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-text-primary-dark font-semibold">
                      {req.requester.name}
                    </p>
                    <p className="text-text-secondary-dark text-sm">
                      {req.requester.email}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(req.requester._id)}
                    className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-bold text-text-primary-dark hover:bg-gray-200"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(req.requester._id)}
                    className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-accent-tertiary"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "sent" && (
          <div className="flex flex-col divide-y divide-gray-200">
            {sentRequests.length === 0 && (
              <p className="py-10 text-center text-gray-500">No sent requests</p>
            )}

            {sentRequests.map((req) => (
              <div key={req._id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                    {req.recipient.avatar ? (
                      <img
                        src={req.recipient.avatar}
                        alt={req.recipient.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(req.recipient.name)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-text-primary-dark font-semibold">
                      {req.recipient.name}
                    </p>
                    <p className="text-text-secondary-dark text-sm">
                      {req.recipient.email}
                    </p>
                    <p className="text-xs text-orange-600 font-medium mt-1">Waiting for response...</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleCancelRequest(req.recipient._id)}
                    className="rounded-full bg-red-100 px-6 py-2.5 text-sm font-bold text-red-600 hover:bg-red-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "accepted" && (
          <div className="flex flex-col divide-y divide-gray-200">
            {acceptedFriends.length === 0 && (
              <p className="py-10 text-center text-gray-500">No accepted friends yet</p>
            )}

            {acceptedFriends.map((friend) => (
              <div key={friend._id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent-secondary flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{getInitials(friend.name)}</span>
                      )}
                    </div>

                    <div
                      className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${
                        isUserOnline(friend._id) ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-text-primary-dark font-semibold">
                      {friend.name}
                    </p>
                    <p className="text-text-secondary-dark text-sm">
                      {friend.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        isUserOnline(friend._id) ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <p className={`text-xs font-medium ${
                        isUserOnline(friend._id) 
                          ? 'text-green-600' 
                          : 'text-gray-500'
                      }`}>
                        {isUserOnline(friend._id) ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleMessageClick(friend._id)}
                    className="rounded-full bg-primary/10 px-6 py-2.5 text-sm font-bold text-primary hover:bg-primary/20 flex items-center gap-2"
                  >
                    <MessageCircle size={16} />
                    Message
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(friend._id)}
                    className="rounded-full bg-red-100 px-6 py-2.5 text-sm font-bold text-red-600 hover:bg-red-200 flex items-center gap-2"
                  >
                    <UserMinus size={16} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}


        {activeTab === "rejected" && (
          <div className="flex flex-col divide-y divide-gray-200">
            {rejectedRequests.length === 0 && (
              <p className="py-10 text-center text-gray-500">No rejected requests</p>
            )}

            {rejectedRequests.map((req) => (
              <div key={req._id} className="flex items-center justify-between gap-4 py-4 opacity-60">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-lg overflow-hidden">
                    {req.requester?.avatar ? (
                      <img
                        src={req.requester.avatar}
                        alt={req.requester.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(req.requester?.name)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-text-primary-dark font-semibold">
                      {req.requester?.name || 'Unknown'}
                    </p>
                    <p className="text-text-secondary-dark text-sm">
                      {req.requester?.email || ''}
                    </p>
                    <p className="text-xs text-red-500">Rejected</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>


      <div className="flex flex-col gap-6 rounded-2xl bg-gray-50 p-6 h-fit lg:sticky lg:top-8 shadow-md">

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary-dark">
            Friends List
          </h2>
          <span className="text-sm text-gray-600 font-medium">
            {isSearching ? `${acceptedFriends.length} found` : `${acceptedFriends.length} / ${totalFriends}`}
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-dark" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="w-full rounded-full bg-white py-2.5 pl-11 pr-10 text-text-primary-dark text-sm
                         placeholder:text-text-secondary-dark border border-gray-200
                         focus:ring-primary focus:border-primary outline-none transition"
              placeholder="Search friends..."
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-accent-tertiary transition"
          >
            Search
          </button>
        </div>

        {!isSearching && totalFriends > 5 && (
          <p className="text-xs text-gray-500 text-center">
            Showing latest 5 friends. Search to find others.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {acceptedFriends.length === 0 && searchQuery && (
            <p className="text-center text-gray-500 py-4">No friends found</p>
          )}
          {acceptedFriends.map((friend) => (
            <div key={friend._id} className="flex items-center justify-between hover:bg-white p-3 rounded-xl">

              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent-secondary flex items-center justify-center text-white font-bold overflow-hidden">
                    {friend.avatar ? (
                      <img 
                        src={friend.avatar} 
                        alt={friend.name}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span>{getInitials(friend.name)}</span>
                    )}
                  </div>

                  <div
                    className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-gray-50 shadow-sm ${
                      isUserOnline(friend._id) ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                </div>

                <p className="text-text-primary-dark font-semibold">{friend.name}</p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleMessageClick(friend._id)}
                  className="hover:bg-primary/20 rounded-full h-9 w-9 flex items-center justify-center text-text-secondary-dark hover:text-primary"
                >
                  <MessageCircle size={18} />
                </button>

                <button
                  onClick={() => handleRemoveFriend(friend._id)}
                  className="hover:bg-red-200/40 rounded-full h-9 w-9 flex items-center justify-center text-red-400 hover:text-red-600"
                >
                  <UserMinus size={18} />
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>

    </main>
  );
};

export default FriendsSection;
