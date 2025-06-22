import { useEffect, useState } from "react";
import {jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import PatientDashboard from "@/components/PatientDashboard";
import CaretakerDashboard from "@/components/CaretakerDashboard";
import { Button } from "@/components/ui/button";
import { Users, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

type UserType = "patient" | "caretaker" | null;

const Index = () => {
  const [userType, setUserType] = useState<UserType>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("jwt_token");

    if (!token) {
      navigate("/login"); // Redirect to login if not authenticated
      return;
    }

    try {
      const decoded: { role: UserType } = jwtDecode(token);
      setUserType(decoded.role);
    } catch (err) {
      console.error("Invalid token", err);
      Cookies.remove("jwt_token");
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    Cookies.remove("jwt_token");
    navigate("/login");
  };

  if (!userType) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-border/20 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">MediCare Companion</h1>
              <p className="text-sm text-muted-foreground">
                {userType === "patient" ? "Patient View" : "Caretaker View"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 🚫 Hide switch button - user can't change role */}
            <Button disabled className="flex items-center gap-2">
              {userType === "patient" ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
              {userType === "patient" ? "Patient Only Access" : "Caretaker Only Access"}
            </Button>

            {/* 🔓 Logout Button */}
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {userType === "patient" ? <PatientDashboard /> : <CaretakerDashboard />}
      </main>
    </div>
  );
};

export default Index;
