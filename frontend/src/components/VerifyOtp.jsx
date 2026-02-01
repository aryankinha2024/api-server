import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, Loader2, ShieldCheck } from "lucide-react";
import axios from "../api/axios";
import login_image from "../assets/login_illustration.jpg";

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!email) {
    return (
      <div className="flex items-center justify-center h-screen text-[#3d3636]">
        <p className="text-lg">No email found. Go back to signup.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/auth/verify-otp", {
        email,
        otp,
      });

      // Save access token and user data
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2 bg-[#fefefe]">
      
      {/* LEFT SIDE */}
      <div className="flex items-center justify-center p-6 bg-[#fefefe]">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FE795F] rounded-2xl shadow-md">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#3d3636]">Verify OTP</h1>
            <p className="text-[#3d3636] opacity-70 mt-2">
              Enter the code sent to <span className="font-semibold">{email}</span>
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-5">

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-[#3d3636] mb-2">
                  Enter OTP
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#66342b]" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg 
                      focus:ring-2 focus:ring-[#FE795F] focus:border-transparent tracking-widest text-lg"
                    placeholder="------"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FE795F] hover:bg-[#DA7D6C] text-white py-3 rounded-lg 
                font-medium transition shadow-lg disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#3d3636]">
              Didn’t receive it?{" "}
              <span className="text-[#FE795F] font-medium cursor-pointer">
                Resend OTP
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT IMAGE */}
      <div className="hidden md:flex items-center justify-center p-10 bg-[#fefefe]">
        <img
          src={login_image}
          alt="illustration"
          className="w-3/4 max-w-xl"
        />
      </div>
    </div>
  );
};

export default VerifyOtp;
