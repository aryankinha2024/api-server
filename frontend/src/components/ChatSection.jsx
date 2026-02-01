import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Send,
  ArrowUpDown,
} from "lucide-react";
import toast from 'react-hot-toast';
import api from "../api/axios";
import socket from "../socket/index";

const ChatSection = ({ selectedRoom, onRoomLoaded }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [user, setUser] = useState(null);
  const [userError, setUserError] = useState(false);
  const [areFriends, setAreFriends] = useState(true);

  const messagesEndRef = useRef(null);
  
  // Get user from localStorage with validation
  useEffect(() => {
    const loadUser = () => {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          let userData = JSON.parse(userStr);
          
          if (userData && userData.id && !userData._id) {
            userData._id = userData.id;
          }
          
          // Validate user has required fields
          if (!userData || !userData._id || !userData.name || !userData.email) {
            console.error("Invalid user object in localStorage:", userData);
            setUserError(true);
            setUser(null);
          } else {
            setUser(userData);
            setUserError(false);
          }
        } else {
          setUserError(true);
          setUser(null);
        }
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        setUserError(true);
        setUser(null);
      }
    };

    loadUser();

    // Listen for user updates
    const handleUserUpdate = () => {
      loadUser();
    };

    window.addEventListener('userUpdated', handleUserUpdate);

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load chat rooms and ensure socket is connected
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get("/rooms/my");
        // console.log("Rooms loaded:", res.data.rooms);
        setRooms(res.data.rooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };
    
    // Ensure socket is connected
    if (!socket.connected) {
      const token = localStorage.getItem("accessToken");
      if (token) {
        // console.log("🔌 Connecting socket...");
        socket.auth = { token };
        socket.connect();
      }
    } else {
      // console.log("Socket already connected");
    }
    
    // Handle online users updates
    const handleOnlineUsers = (userIds) => {
      setOnlineUserIds(userIds);
    };
    
    // Log socket connection status
    socket.on("connect", () => {
      socket.emit('online-users');
    });
    
    socket.on("disconnect", () => {
      // console.log("Socket disconnected");
    });
    
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    socket.on('online-users', handleOnlineUsers);


    if (socket.connected) {
      socket.emit('online-users');
    }
    
    fetchRooms();
    
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off('online-users', handleOnlineUsers);
    };
  }, []);

  // Handle selectedRoom prop from Friends page
  useEffect(() => {
    if (selectedRoom && selectedRoom._id) {
      // Check if room exists in the list
      const existingRoom = rooms.find(r => r._id === selectedRoom._id);
      
      if (existingRoom) {
        if (activeRoom?._id !== existingRoom._id) {
          loadMessages(existingRoom);
        }
      } else {
        setRooms(prev => {
          const alreadyExists = prev.some(r => r._id === selectedRoom._id);
          if (alreadyExists) {
            return prev;
          }
          return [selectedRoom, ...prev];
        });
        
        // Load messages for the new room
        if (activeRoom?._id !== selectedRoom._id) {
          loadMessages(selectedRoom);
        }
      }
      
      if (onRoomLoaded) {
        onRoomLoaded();
      }
    }
  }, [selectedRoom?._id]); 

  const loadMessages = async (room) => {
    if (!room || !room._id) {
      console.error("Invalid room:", room);
      return;
    }

    setActiveRoom(room);
    setLoadingMessages(true);

    if (socket.connected) {
      socket.emit("join-room", { roomId: room._id });
      // console.log("🔌 Joined socket room:", room._id);
    }

    try {
      const res = await api.get(`/messages/${room._id}`);
      
      const messagesData = res.data.messages || [];
      
      setMessages(messagesData);
      setLoadingMessages(false);
      
      // Mark messages as read
      try {
        await api.post(`/rooms/${room._id}/mark-read`);
        setRooms(prevRooms => 
          prevRooms.map(r => 
            r._id === room._id ? { ...r, unreadCount: 0 } : r
          )
        );
      } catch (err) {
        console.error("Error marking room as read:", err);
      }
      
      // Check friendship status with the other participant
      const otherParticipant = room.participants.find(p => p._id !== user?._id);
      if (otherParticipant) {
        try {
          const friendshipRes = await api.get(`/friends/status/${otherParticipant._id}`);
          setAreFriends(friendshipRes.data.areFriends);
        } catch (err) {
          console.error("Error checking friendship status:", err);
          setAreFriends(false);
        }
      }
      
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    
    const handleNewMessage = (msg) => {
      const isActiveRoom = msg.roomId === activeRoom?._id;
      
      if (isActiveRoom) {
        setMessages((prev) => {

          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(), 100);
      } else {
        // console.log("⚠️ Message not for active room, skipping");
      }

      setRooms((prev) => {
        const updatedRoom = prev.find((room) => room._id === msg.roomId);
        if (!updatedRoom) return prev;

        const roomWithNewMessage = {
          ...updatedRoom,
          lastMessage: { text: msg.text, createdAt: msg.createdAt },

          unreadCount: (!isActiveRoom && msg.sender !== user?._id) 
            ? (updatedRoom.unreadCount || 0) + 1 
            : updatedRoom.unreadCount || 0
        };

        const otherRooms = prev.filter((room) => room._id !== msg.roomId);
        return [roomWithNewMessage, ...otherRooms];
      });
    };

    const handleReceiveMessage = (msg) => {
      const isActiveRoom = msg.roomId === activeRoom?._id;
      
      if (isActiveRoom) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => scrollToBottom(), 100);
      }
      
      // Update unread count if not in active room
      if (!isActiveRoom && msg.sender !== user?._id) {
        setRooms((prev) => 
          prev.map(room => 
            room._id === msg.roomId 
              ? { ...room, unreadCount: (room.unreadCount || 0) + 1 }
              : room
          )
        );
      }
    };

    const handleMessageUnsent = ({ messageId, newText }) => {
      setMessages((prev) => 
        prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, text: newText, isUnsent: true }
            : msg
        )
      );
      setTimeout(() => scrollToBottom(), 100);
    };

    socket.on("new-message", handleNewMessage);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("message:unsent", handleMessageUnsent);

    return () => {
      // console.log("🔇 Removing socket listeners");
      socket.off("new-message", handleNewMessage);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("message:unsent", handleMessageUnsent);
    };
  }, [activeRoom, user?._id]);

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() || !activeRoom) return;

    // Check if users are still friends
    if (!areFriends) {
      toast.error("You need to be friends to send messages");
      return;
    }

    // Store message and clear input immediately to prevent duplicate sends
    const textToSend = messageText.trim();
    setMessageText("");

    try {
      const response = await api.post("/messages", {
        roomId: activeRoom._id,
        text: textToSend,
      });

      // console.log("Message sent:", response.data);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Show specific error message if not friends
      if (error.response?.data?.message === "You are not friends anymore") {
        toast.error("You are not friends anymore. Cannot send message.");
        setAreFriends(false);
      } else {
        toast.error("Failed to send message. Please try again.");
      }
      
      setMessageText(textToSend);
    }
  };

  // Unsend message
  const handleUnsendMessage = async (messageId) => {
    try {
      await api.put(`/messages/unsend/${messageId}`);
      
    
      socket.emit("message:unsend", { 
        messageId, 
        roomId: activeRoom._id 
      });

      // Update local state
      setMessages((prev) => 
        prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, text: "This message was unsent", isUnsent: true }
            : msg
        )
      );
    } catch (error) {
      console.error("Error unsending message:", error);
    }
  };

  // Filter and sort rooms
  const getFilteredAndSortedRooms = () => {
    let filteredRooms = [...rooms];

    // Filter by unread only
    if (showUnreadOnly) {
      filteredRooms = filteredRooms.filter((room) => room.unreadCount > 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filteredRooms = filteredRooms.filter((room) => {
        const friend = room.participants?.find((p) => p._id !== user._id);
        if (!friend) return false;
        
        const searchLower = searchQuery.toLowerCase();
        return (
          friend.name?.toLowerCase().includes(searchLower) ||
          friend.email?.toLowerCase().includes(searchLower) ||
          room.lastMessage?.text?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Sort alphabetically if enabled
    if (sortAlphabetically) {
      filteredRooms.sort((a, b) => {
        const friendA = a.participants?.find((p) => p._id !== user._id);
        const friendB = b.participants?.find((p) => p._id !== user._id);
        
        const nameA = friendA?.name || '';
        const nameB = friendB?.name || '';
        
        return nameA.localeCompare(nameB);
      });
    }

    return filteredRooms;
  };

  // If no user or invalid user, show error and force logout
  if (!user || !user._id || userError) {
    console.error("No valid user found in localStorage");
    
    // Auto-logout helper function
    const handleForceLogout = () => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      if (socket.connected) {
        socket.disconnect();
      }
      navigate('/login', { replace: true });
    };
    
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          
          <h1 className="text-red-600 font-bold mb-2 text-2xl">Authentication Error</h1>
          <p className="text-gray-600 mb-6">
            Your session is invalid or corrupted. Please log in again.
          </p>
          
          <div className="flex gap-3 justify-center">
            <button 
              onClick={handleForceLogout}
              className="bg-primary text-white px-6 py-3 rounded-full hover:bg-primary/90 font-medium shadow-lg"
            >
              Clear & Go to Login
            </button>
          </div>
          
          <details className="mt-6 text-left bg-gray-100 p-4 rounded-lg">
            <summary className="cursor-pointer text-xs text-gray-500 font-medium">
              🔍 Technical Details
            </summary>
            <div className="text-xs mt-3 space-y-2">
              <div>
                <strong>User in localStorage:</strong>
                <pre className="bg-white p-2 rounded mt-1 overflow-auto text-[10px]">
{localStorage.getItem("user") || "null"}
                </pre>
              </div>
              <div>
                <strong>Parsed user object:</strong>
                <pre className="bg-white p-2 rounded mt-1 overflow-auto text-[10px]">
{JSON.stringify(user, null, 2)}
                </pre>
              </div>
              <div>
                <strong>Error:</strong>
                <p className="bg-white p-2 rounded mt-1">
                  {userError ? "User validation failed - missing required fields (_id, name, or email)" : "User object is null"}
                </p>
              </div>
            </div>
          </details>
        </div>
      </div>
    );
  }

  const filteredAndSortedRooms = getFilteredAndSortedRooms();

  return (
    <main className="flex-1 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] h-screen overflow-hidden bg-gray-50">

      <div className="flex flex-col bg-white border-r border-gray-200 h-screen overflow-hidden">
        
        <div className="p-6">
          <h1 className="text-4xl font-black">Chats</h1>

          {/* Search Bar with Filter Buttons */}
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            
            {/* Unread Filter Button */}
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`rounded-full p-3 flex items-center justify-center transition-colors relative ${
                showUnreadOnly
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={showUnreadOnly ? "Showing unread only (click to show all)" : "Show unread only"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {!showUnreadOnly && rooms.filter(r => r.unreadCount > 0).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {rooms.filter(r => r.unreadCount > 0).length}
                </span>
              )}
            </button>
            
            {/* Sort Button */}
            <button
              onClick={() => setSortAlphabetically(!sortAlphabetically)}
              className={`rounded-full p-3 flex items-center justify-center transition-colors ${
                sortAlphabetically
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={sortAlphabetically ? "Sorted A-Z (click to unsort)" : "Sort A-Z"}
            >
              <ArrowUpDown className="w-5 h-5" />
            </button>
          </div>

          {/* Results count */}
          {searchQuery && (
            <p className="text-xs text-gray-500 mt-2">
              {filteredAndSortedRooms.length} result{filteredAndSortedRooms.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredAndSortedRooms.length === 0 && rooms.length === 0 && (
            <p className="text-center text-gray-500 py-10">No conversations yet</p>
          )}
          {filteredAndSortedRooms.length === 0 && rooms.length > 0 && (
            <p className="text-center text-gray-500 py-10">No chats match your search</p>
          )}
          {filteredAndSortedRooms.map((room) => {
            const friend = room.participants?.find((p) => p._id !== user._id);
            
            if (!friend) {
              // console.warn("Room missing friend participant:", room);
              return null;
            }

            const isOnline = onlineUserIds.includes(friend._id);

            return (
              <div
                key={room._id}
                onClick={() => loadMessages(room)}
                className={`flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 ${
                  activeRoom?._id === room._id ? "bg-primary/10 border-r-4 border-primary" : ""
                }`}
              >
                <div className="relative">
                  {friend.avatar ? (
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="h-14 w-14 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent-secondary flex items-center justify-center text-white font-bold text-xl border-2 border-gray-200 shadow-sm">
                      {friend.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  {/* Online/Offline Status Indicator */}
                  <div 
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                      isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    title={isOnline ? 'Online' : 'Offline'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{friend.name}</p>
                      {room.unreadCount > 0 && (
                        <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                          {room.unreadCount > 99 ? '99+' : room.unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {room.lastMessage ? new Date(room.lastMessage.createdAt).toLocaleTimeString() : ""}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 truncate">
                    {room.lastMessage?.text || "No messages yet"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col bg-gray-50 h-full overflow-hidden relative">

        {/* TOP BAR */}
        {activeRoom && (() => {
          const friend = activeRoom.participants.find((p) => p._id !== user._id);
          const isOnline = onlineUserIds.includes(friend?._id);
          
          // Format last seen
          const getLastSeenText = () => {
            if (isOnline) return 'Online';
            if (!friend?.lastSeen) return 'Last seen: Unknown';
            
            const lastSeenDate = new Date(friend.lastSeen);
            const now = new Date();
            const diffMs = now - lastSeenDate;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Last seen: Just now';
            if (diffMins < 60) return `Last seen: ${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
            if (diffHours < 24) return `Last seen: ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
            if (diffDays < 7) return `Last seen: ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
            
            return `Last seen: ${lastSeenDate.toLocaleDateString()}`;
          };
          
          return (
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b-2 border-gray-100 shrink-0 shadow-sm">
              <div className="flex items-center gap-4">
                {friend?.avatar ? (
                  <img
                    src={friend.avatar}
                    alt={friend.name}
                    className="h-14 w-14 rounded-full object-cover border-3 border-gray-200 shadow-md"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent-secondary flex items-center justify-center text-white font-bold text-xl border-3 border-gray-200 shadow-md">
                    {friend?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <p className="font-bold text-lg text-gray-800">{friend?.name || 'Unknown'}</p>
                  <p className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                    {getLastSeenText()}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md px-8">
                <div className="bg-gradient-to-br from-primary/10 to-accent-secondary/10 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">No messages yet</h3>
                <p className="text-gray-500 mb-4">Start the conversation by sending a message below</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              // Skip messages without proper data
              if (!msg || !msg._id) {
                // console.warn("Invalid message:", msg);
                return null;
              }

              // Check if sender exists and is valid
              if (!msg.sender || (typeof msg.sender === 'object' && !msg.sender._id)) {
                // console.warn("Message missing valid sender:", msg);
                return null;
              }

              // Handle both populated sender object and just sender ID
              const senderId = typeof msg.sender === 'object' && msg.sender._id 
                ? msg.sender._id 
                : msg.sender;
              
              const senderName = typeof msg.sender === 'object' && msg.sender.name 
                ? msg.sender.name 
                : 'Unknown';
              
              const senderAvatar = typeof msg.sender === 'object' && msg.sender.avatar 
                ? msg.sender.avatar 
                : null;
              
              // Final check - skip if senderId is still invalid
              if (!senderId || typeof senderId === 'undefined' || senderId === null) {
                // console.warn("Message with invalid senderId:", msg);
                return null;
              }
              
              // Convert both to strings for comparison (ObjectId vs string issue)
              const senderIdStr = String(senderId);
              const userIdStr = String(user._id);
              const isOwnMessage = senderIdStr === userIdStr;
              

              
              return (
                <div
                  key={msg._id}
                  className={`flex gap-3 ${
                    isOwnMessage ? "justify-end" : "justify-start"
                  } group`}
                >
                  {!isOwnMessage && !msg.isUnsent && senderAvatar && (
                    <img
                      src={senderAvatar}
                      alt={senderName}
                      className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                    />
                  )}
                  {!isOwnMessage && !msg.isUnsent && !senderAvatar && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent-secondary flex items-center justify-center text-white font-bold text-sm border-2 border-gray-200 shadow-sm">
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className={`max-w-xl ${isOwnMessage ? "items-end" : "items-start"} flex flex-col`}>
                    {!isOwnMessage && !msg.isUnsent && (
                      <span className="text-xs text-gray-600 mb-1 px-1">
                        {senderName}
                      </span>
                    )}
                    <div className="flex items-end gap-2 group/message">
                      <div
                        className={`p-4 rounded-2xl ${
                          msg.isUnsent
                            ? "bg-gray-100 border border-gray-200 text-gray-400 italic"
                            : isOwnMessage
                            ? "bg-primary text-white rounded-br-sm"
                            : "bg-white border border-gray-200 rounded-bl-sm"
                        }`}
                      >
                        {msg.isUnsent ? (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            <span className="text-sm whitespace-pre-wrap break-words">{msg.text}</span>
                          </div>
                        ) : (
                          <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                        )}
                      </div>
                      {isOwnMessage && !msg.isUnsent && (
                        <div className="relative mb-1">
                          <button
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all duration-200"
                            title="Message options"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {/* Dropdown menu */}
                          <div className="absolute right-0 mt-1 opacity-0 invisible group-hover/message:opacity-100 group-hover/message:visible transition-all duration-200 z-10">
                            <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
                              <button
                                onClick={() => handleUnsendMessage(msg._id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Unsend
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>

                  {isOwnMessage && !msg.isUnsent && (
                    <>
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent-secondary flex items-center justify-center text-white font-bold text-sm border-2 border-gray-200 shadow-sm">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR - Fixed at bottom */}
        {activeRoom && (
          <div className="px-6 py-4 bg-white border-t-2 border-gray-100 shrink-0 shadow-lg">
            {!areFriends ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-6 py-3 rounded-xl border-2 border-amber-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-semibold">You need to be friends to send messages</p>
                </div>
                <p className="text-xs text-gray-500">You can still view your previous conversation history</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-5 py-3 border border-gray-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <textarea
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  className="flex-1 bg-transparent outline-none text-gray-800 placeholder:text-gray-400 resize-none max-h-32 overflow-y-auto whitespace-pre-wrap leading-6"
                  style={{
                    minHeight: '24px',
                    height: '24px'
                  }}
                  onInput={(e) => {
                    // Auto-resize textarea based on content
                    e.target.style.height = '24px';
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                  }}
                />

                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-accent-secondary text-white flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0"
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
        
        {!activeRoom && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
            <div className="text-center max-w-md px-8">
              <div className="bg-primary/10 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Welcome to Chat</h2>
              <p className="text-gray-500 mb-6">Select a conversation from the list to start messaging with your friends</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Choose a chat to begin</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ChatSection;
