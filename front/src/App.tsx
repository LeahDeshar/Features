// import { useState } from "react";
// import "./App.css";
// import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
// import Home from "./pages/Home";
// import About from "./pages/About";
// import Contact from "./pages/Contact";
// import NotFound from "./pages/NotFound";
// import ProtectedRoute from "./routes/ProtectedRoute";
// import PublicRoute from "./routes/PublicRoute";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
// import Profile from "./pages/Profile";
// import Blog from "./pages/Blog";
// function App() {
//   return (
//     <Router>
//       <div>
//         <nav>
//           <ul>
//             <li>
//               <Link to="/">Home</Link>
//             </li>
//             <li>
//               <Link to="/blog">Blog</Link>
//             </li>
//             <li>
//               <Link to="/profile">Profile</Link>
//             </li>
//           </ul>
//         </nav>
//         <Routes>
//           <Route path="/contact" element={<Contact />} />
//           <Route
//             path="/"
//             element={
//               <ProtectedRoute>
//                 <Home />
//               </ProtectedRoute>
//             }
//           />
//           <Route
//             path="/profile"
//             element={
//               <ProtectedRoute>
//                 <Profile />
//               </ProtectedRoute>
//             }
//           />
//           <Route
//             path="/blog"
//             element={
//               <ProtectedRoute>
//                 <Blog />
//               </ProtectedRoute>
//             }
//           />

//           <Route path="/login" element={<Login />} />
//           <Route path="/register" element={<Register />} />
//           <Route
//             path="/about"
//             element={
//               <ProtectedRoute>
//                 <About />
//               </ProtectedRoute>
//             }
//           />
//           <Route path="*" element={<NotFound />} />
//         </Routes>
//       </div>
//     </Router>
//   );
// }

// export default App;

import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();

  console.log({ onlineUsers });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  console.log({ authUser });

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme}>
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
      </Routes>

      <Toaster />
    </div>
  );
};
export default App;
