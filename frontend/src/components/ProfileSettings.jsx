import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import api from "../api/axios";

const ProfileSettings = () => {
  const [name, setName] = useState("Alex Doe");
  const [user, setUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Load user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setName(userData.name || "");
    }
  }, []);

  // Handle file selection (show preview only, don't upload yet)
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle save changes (upload avatar + update name)
  const handleSaveChanges = async () => {
    setUploading(true);
    try {
      let updatedUser = { ...user };
      let hasChanges = false;

      // Check if name changed
      const nameChanged = name.trim() !== user.name;

      // Upload avatar if a new file was selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('avatar', selectedFile);

        const response = await api.put('/profile/avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        updatedUser.avatar = response.data.avatarUrl;
        hasChanges = true;
      }

      // Update name if it changed
      if (nameChanged) {
        const response = await api.put('/profile/update', { 
          name: name.trim() 
        });

        updatedUser = { ...updatedUser, ...response.data.user };
        hasChanges = true;
      }

      if (hasChanges) {
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setSelectedFile(null);
        setPreviewUrl(null);

        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('userUpdated'));

        toast.success('Profile updated successfully!');
      } else {
        toast.info('No changes to save');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile. Please try again.';
      toast.error(errorMessage);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  // Handle cancel (reset changes)
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setName(userData.name || "");
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await api.put('/profile/change-password', {
        currentPassword,
        newPassword
      });

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast.success("Password changed successfully!");
    } catch (error) {
      console.error("Password change error:", error);
      const errorMessage = error.response?.data?.message || "Failed to change password";
      toast.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <main className="flex-1 p-6 bg-background-light">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-text-primary-dark text-3xl font-black tracking-[-0.02em]">
            Profile Settings
          </h1>
          <p className="text-text-secondary-dark text-sm">
            Manage your profile information and account security
          </p>
        </div>

        <div className="flex flex-col gap-6">

          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-6 rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col items-center text-center gap-1">
              <h2 className="text-text-primary-dark text-base font-bold">Profile Picture</h2>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                {(previewUrl || user?.avatar) ? (
                  <div
                    className="h-28 w-28 rounded-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${previewUrl || user.avatar}")`,
                    }}
                  />
                ) : (
                  <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-accent-secondary flex items-center justify-center text-white font-bold text-4xl">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                
                {/* Pencil Icon Button */}
                <button 
                  onClick={() => document.getElementById('avatar-upload').click()}
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-accent-tertiary transition-colors shadow-lg border-2 border-white"
                  title="Change profile picture"
                  disabled={uploading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                
                {/* Hidden file input */}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col md:flex-row items-start gap-4 rounded-lg border border-gray-200 p-5">
            <div className="flex-1">
              <h2 className="text-text-primary-dark text-base font-bold">Name</h2>
              <p className="text-text-secondary-dark text-xs">
                This is the name other users will see
              </p>
            </div>

            <div className="w-full md:w-1/2">
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-full border border-gray-300 bg-white py-2.5 px-5 
                text-sm text-text-primary-dark placeholder:text-text-secondary-dark 
                focus:border-primary focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Password Section */}
          <div className="flex flex-col md:flex-row items-start gap-4 rounded-lg border border-gray-200 p-5">
            <div className="flex-1">
              <h2 className="text-text-primary-dark text-base font-bold">Password</h2>
              <p className="text-text-secondary-dark text-xs">
                Update your password regularly to stay secure
              </p>
            </div>

            <div className="w-full md:w-1/2 flex flex-col gap-3">
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={changingPassword}
                className="w-full rounded-full border border-gray-300 bg-white py-2.5 px-5 
                text-sm text-text-primary-dark placeholder:text-text-secondary-dark 
                focus:border-primary focus:ring-primary outline-none disabled:opacity-50"
              />

              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={changingPassword}
                className="w-full rounded-full border border-gray-300 bg-white py-2.5 px-5 
                text-sm text-text-primary-dark placeholder:text-text-secondary-dark 
                focus:border-primary focus:ring-primary outline-none disabled:opacity-50"
              />

              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={changingPassword}
                className="w-full rounded-full border border-gray-300 bg-white py-2.5 px-5 
                text-sm text-text-primary-dark placeholder:text-text-secondary-dark 
                focus:border-primary focus:ring-primary outline-none disabled:opacity-50"
              />

              <button
                onClick={handlePasswordChange}
                disabled={changingPassword}
                className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-accent-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {changingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-2">
          <button 
            onClick={handleCancel}
            disabled={uploading}
            className="rounded-full bg-gray-100 px-5 py-2 text-xs font-bold text-text-primary-dark hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveChanges}
            disabled={uploading}
            className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-accent-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </main>
  );
};

export default ProfileSettings;
