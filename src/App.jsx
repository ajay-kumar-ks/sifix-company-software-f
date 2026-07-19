import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Crm from './pages/Crm'
import ContactDetails from './pages/ContactDetails'
import Hr from './pages/Hr'
import EmployeeProfile from './pages/EmployeeProfile'
import AuditLog from './pages/AuditLog'
function ProtectedRoute({ children, allowedRole = 'both' }){
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('user_role')

  if (!token) return <Navigate to="/login" replace />
  if (allowedRole === 'employee' && role !== 'employee') return <Navigate to="/dashboard" replace />
  if (allowedRole === 'admin' && role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

export default function App(){
  const role = localStorage.getItem('user_role')

  return (
    <Routes>
      <Route path="/login" element={<Login/>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
      <Route path="/crm" element={<ProtectedRoute><Crm/></ProtectedRoute>} />
      <Route path="/crm/contact/:referenceId" element={<ProtectedRoute><ContactDetails/></ProtectedRoute>} />
      <Route path="/hr" element={<ProtectedRoute allowedRole="admin"><Hr/></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute allowedRole="admin"><AuditLog /></ProtectedRoute>} />
      <Route path="/employee/profile" element={<ProtectedRoute allowedRole="employee"><EmployeeProfile /></ProtectedRoute>} />
      <Route path="/employee/dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/employee/crm" element={<Navigate to="/crm" replace />} />
      <Route path="/" element={<Navigate to={role === 'employee' ? '/dashboard' : '/dashboard'} replace />} />
      <Route path="*" element={<Navigate to={role === 'employee' ? '/dashboard' : '/crm'} replace />} />
    </Routes>
  )
}
