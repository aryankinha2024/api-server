import React, { useState } from "react";
import ChatSidebar from "../components/ChatSidebar";
import ChatSection from "../components/ChatSection";
import GlobalSection from "../components/GlobalSection";
import FriendsSection from "../components/FriendsSection";
import ProfileSettings from "../components/ProfileSettings";
const Home = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedRoomFromFriends, setSelectedRoomFromFriends] = useState(null);

  const handleOpenChat = (room) => {
    setSelectedRoomFromFriends(room);
    setActiveTab('chat');
  };

  const clearSelectedRoom = () => {
    setSelectedRoomFromFriends(null);
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'chat':
        return <ChatSection selectedRoom={selectedRoomFromFriends} onRoomLoaded={clearSelectedRoom} />;
      case 'global':
        return <GlobalSection />;
      case 'friends':
        return <FriendsSection onOpenChat={handleOpenChat} />;
      case 'profile':
        return <ProfileSettings />;
      default:
        return <ChatSection selectedRoom={selectedRoomFromFriends} onRoomLoaded={clearSelectedRoom} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#fefefe]">
      <ChatSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
};

export default Home;
