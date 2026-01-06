import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./pages/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import MyPetitions from "./pages/MyPetitions";
import CreatePetition from "./pages/CreatePetition";
import PetitionDetail from "./pages/PetitionDetail";
import AllPetitions from "./pages/AllPetitions";
import UserManagement from "./pages/UserManagement";
import ProductivityReports from "./pages/ProductivityReports";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="peticiones" element={<MyPetitions />} />
            <Route path="peticiones/nueva" element={<CreatePetition />} />
            <Route path="peticiones/:id" element={<PetitionDetail />} />
            <Route path="todas-peticiones" element={<AllPetitions />} />
            <Route path="usuarios" element={<UserManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
