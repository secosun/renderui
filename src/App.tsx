import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { MyTasks } from './pages/MyTasks';
import { NewTask } from './pages/NewTask';
import { TemplateDetail } from './pages/TemplateDetail';
import { TaskDetail } from './pages/TaskDetail';
import { ApiKeys } from './pages/ApiKeys';
import { Plans } from './pages/Plans';
import { Subscription } from './pages/Subscription';
import { AdminDashboard } from './pages/AdminDashboard';
import { Webhooks } from './pages/Webhooks';
import { Team } from './pages/Team';
import { Scenes } from './pages/Scenes';
import { Profile } from './pages/Profile';
import { Gallery } from './pages/Gallery';
import { Workers } from './pages/Workers';
import { AdminTemplates } from './pages/admin/Templates';
import { AdminFinishes } from './pages/admin/Finishes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
            <Route path="/templates/:slug" element={<ProtectedRoute><TemplateDetail /></ProtectedRoute>} />
            <Route path="/new" element={<ProtectedRoute><NewTask /></ProtectedRoute>} />
            <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
            <Route path="/api-keys" element={<ProtectedRoute><ApiKeys /></ProtectedRoute>} />
            <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/webhooks" element={<ProtectedRoute><Webhooks /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/scenes" element={<ProtectedRoute><Scenes /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
            <Route path="/workers" element={<ProtectedRoute><Workers /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
            <Route path="/admin/templates" element={<ProtectedRoute><AdminRoute><AdminTemplates /></AdminRoute></ProtectedRoute>} />
            <Route path="/admin/finishes" element={<ProtectedRoute><AdminRoute><AdminFinishes /></AdminRoute></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
