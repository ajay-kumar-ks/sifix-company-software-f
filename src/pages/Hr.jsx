import React, { useEffect, useRef, useState, useMemo, useReducer } from 'react'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import Loader from '../components/Loader'
import NotificationContainer, { notificationReducer, createNotification } from '../components/NotificationContainer'
import { FaSearch, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaUserPlus, FaBuilding, FaCalendarCheck, FaUmbrella, FaMoneyBillWave, FaUsers, FaBriefcase, FaClock, FaBan, FaCheckCircle, FaHourglassHalf, FaDollarSign, FaDownload, FaFilter, FaUserLock, FaToggleOn, FaToggleOff } from 'react-icons/fa'

const API = import.meta.env.VITE_API_URL
const REQUEST_TIMEOUT_MS = 8000

const hrTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: FaUsers },
  { id: 'employees', label: 'Employees', icon: FaBriefcase },
  { id: 'departments', label: 'Departments', icon: FaBuilding },
  { id: 'attendance', label: 'Attendance', icon: FaCalendarCheck },
  { id: 'leaves', label: 'Leave Requests', icon: FaUmbrella },
  { id: 'payroll', label: 'Payroll', icon: FaMoneyBillWave },
  { id: 'users', label: 'Users', icon: FaUserLock },
]

const leaveTypes = ['Sick', 'Casual', 'Annual', 'Personal', 'Maternity', 'Paternity']
const attendanceStatuses = ['Present', 'Absent', 'Late', 'Half Day']
const employeeStatuses = ['Active', 'Inactive', 'On Leave', 'Terminated']

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export default function Hr() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, dispatchNotifications] = useReducer(notificationReducer, [])

  // Data states
  const [stats, setStats] = useState({ total_employees: 0, total_departments: 0, pending_leaves: 0, today_attendance: 0 })
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [leaves, setLeaves] = useState([])
  const [payrolls, setPayrolls] = useState([])
  const [hrUsers, setHrUsers] = useState([])

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState('') // employee, department, attendance, leave, payroll, user
  const [editingItem, setEditingItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form data
  const emptyEmployeeForm = {
    employee_id: '', first_name: '', last_name: '', email: '', phone: '',
    position: '', department_id: '', salary: '', hire_date: '', status: 'Active',
    address: '', emergency_contact: '', emergency_phone: '',
  }
  const emptyDepartmentForm = { name: '', description: '' }
  const emptyAttendanceForm = { employee_id: '', date: '', check_in: '', check_out: '', status: 'Present', notes: '' }
  const emptyLeaveForm = { employee_id: '', leave_type: 'Sick', start_date: '', end_date: '', reason: '' }
  const emptyPayrollForm = { employee_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), basic_salary: '', allowances: '0', deductions: '0', net_salary: '', payment_date: '', status: 'Pending', notes: '' }
  const emptyUserForm = { employee_id: '', username: '', password: '', role: 'employee' }

  const [formData, setFormData] = useState(emptyEmployeeForm)

  // Filters
  const [leaveFilter, setLeaveFilter] = useState('')
  const [attendanceFilter, setAttendanceFilter] = useState('')

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  async function fetchStats() {
    try {
      const res = await fetchWithTimeout(`${API}/hr/stats`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch HR stats:', err)
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetchWithTimeout(`${API}/hr/employees`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetchWithTimeout(`${API}/hr/departments`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setDepartments(data)
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  async function fetchAttendance() {
    try {
      const res = await fetchWithTimeout(`${API}/hr/attendance`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setAttendance(data)
      }
    } catch (err) {
      console.error('Failed to fetch attendance:', err)
    }
  }

  async function fetchLeaves() {
    try {
      const res = await fetchWithTimeout(`${API}/hr/leaves`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setLeaves(data)
      }
    } catch (err) {
      console.error('Failed to fetch leaves:', err)
    }
  }

  async function fetchPayroll() {
    try {
      const res = await fetchWithTimeout(`${API}/hr/payroll`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setPayrolls(data)
      }
    } catch (err) {
      console.error('Failed to fetch payroll:', err)
    }
  }

  async function fetchHrUsers() {
    try {
      const res = await fetchWithTimeout(`${API}/hr/users`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setHrUsers(data)
      }
    } catch (err) {
      console.error('Failed to fetch HR users:', err)
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchStats(), fetchEmployees(), fetchDepartments(),
      fetchAttendance(), fetchLeaves(), fetchPayroll(), fetchHrUsers(),
    ]).finally(() => setLoading(false))
  }, [])

  // ─── Modal Handlers ────────────────────────────────────────────────────────

  function openCreateModal(type) {
    setModalType(type)
    setEditingItem(null)
    setError('')
    switch (type) {
      case 'employee': setFormData(emptyEmployeeForm); break
      case 'department': setFormData(emptyDepartmentForm); break
      case 'attendance': setFormData(emptyAttendanceForm); break
      case 'leave': setFormData(emptyLeaveForm); break
      case 'payroll': setFormData(emptyPayrollForm); break
      case 'user': setFormData(emptyUserForm); break
    }
    setIsModalOpen(true)
  }

  function openCreateUserModal() {
    setModalType('user')
    setEditingItem(null)
    setError('')
    setFormData(emptyUserForm)
    setIsModalOpen(true)
  }

  function openEditUserModal(user) {
    setModalType('user')
    setEditingItem(user)
    setError('')
    setFormData({
      employee_id: user.employee_id || '',
      username: user.username || '',
      password: '',
      role: user.role || 'employee',
    })
    setIsModalOpen(true)
  }

  function openEditModal(type, item) {
    setModalType(type)
    setEditingItem(item)
    setError('')
    switch (type) {
      case 'employee':
        setFormData({
          employee_id: item.employee_id || '',
          first_name: item.first_name || '',
          last_name: item.last_name || '',
          email: item.email || '',
          phone: item.phone || '',
          position: item.position || '',
          department_id: item.department_id || '',
          salary: item.salary || '',
          hire_date: item.hire_date || '',
          status: item.status || 'Active',
          address: item.address || '',
          emergency_contact: item.emergency_contact || '',
          emergency_phone: item.emergency_phone || '',
        })
        break
      case 'department':
        setFormData({ name: item.name || '', description: item.description || '' })
        break
      case 'attendance':
        setFormData({
          employee_id: item.employee_id || '',
          date: item.date || '',
          check_in: item.check_in || '',
          check_out: item.check_out || '',
          status: item.status || 'Present',
          notes: item.notes || '',
        })
        break
      case 'leave':
        setFormData({
          employee_id: item.employee_id || '',
          leave_type: item.leave_type || 'Sick',
          start_date: item.start_date || '',
          end_date: item.end_date || '',
          reason: item.reason || '',
        })
        break
      case 'payroll':
        setFormData({
          employee_id: item.employee_id || '',
          month: item.month || new Date().getMonth() + 1,
          year: item.year || new Date().getFullYear(),
          basic_salary: item.basic_salary || '',
          allowances: item.allowances || '0',
          deductions: item.deductions || '0',
          net_salary: item.net_salary || '',
          payment_date: item.payment_date || '',
          status: item.status || 'Pending',
          notes: item.notes || '',
        })
        break
    }
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingItem(null)
    setError('')
  }

  function handleInputChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // ─── CRUD Operations ───────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      let url = ''
      let method = 'POST'
      let body = {}

      switch (modalType) {
        case 'employee': {
          url = editingItem ? `${API}/hr/employees/${editingItem.id}` : `${API}/hr/employees`
          method = editingItem ? 'PATCH' : 'POST'
          body = {
            ...formData,
            department_id: formData.department_id ? parseInt(formData.department_id) : null,
            salary: formData.salary ? parseFloat(formData.salary) : null,
          }
          break
        }
        case 'department': {
          url = editingItem ? `${API}/hr/departments/${editingItem.id}` : `${API}/hr/departments`
          method = editingItem ? 'PATCH' : 'POST'
          body = formData
          break
        }
        case 'attendance': {
          url = editingItem ? `${API}/hr/attendance/${editingItem.id}` : `${API}/hr/attendance`
          method = editingItem ? 'PATCH' : 'POST'
          body = {
            ...formData,
            employee_id: parseInt(formData.employee_id),
            check_in: formData.check_in ? new Date(formData.check_in).toISOString() : null,
            check_out: formData.check_out ? new Date(formData.check_out).toISOString() : null,
          }
          break
        }
        case 'leave': {
          url = editingItem ? `${API}/hr/leaves/${editingItem.id}` : `${API}/hr/leaves`
          method = editingItem ? 'PATCH' : 'POST'
          body = {
            ...formData,
            employee_id: parseInt(formData.employee_id),
          }
          break
        }
        case 'payroll': {
          url = editingItem ? `${API}/hr/payroll/${editingItem.id}` : `${API}/hr/payroll`
          method = editingItem ? 'PATCH' : 'POST'
          body = {
            ...formData,
            employee_id: parseInt(formData.employee_id),
            month: parseInt(formData.month),
            year: parseInt(formData.year),
            basic_salary: parseFloat(formData.basic_salary),
            allowances: parseFloat(formData.allowances || '0'),
            deductions: parseFloat(formData.deductions || '0'),
            net_salary: parseFloat(formData.net_salary || formData.basic_salary),
          }
          break
        }
        case 'user': {
          if (editingItem) {
            url = `${API}/hr/users/${editingItem.id}`
            method = 'PATCH'
            body = {}
            if (formData.username) body.username = formData.username
            if (formData.password) body.password = formData.password
          } else {
            url = `${API}/hr/users`
            method = 'POST'
            body = {
              employee_id: parseInt(formData.employee_id),
              username: formData.username,
              password: formData.password,
              role: formData.role,
            }
          }
          break
        }
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.detail || `Failed to ${editingItem ? 'update' : 'create'} ${modalType}`)
      }

      await Promise.all([
        fetchStats(),
        fetchEmployees(),
        fetchDepartments(),
        fetchAttendance(),
        fetchLeaves(),
        fetchPayroll(),
        fetchHrUsers(),
      ])

      closeModal()
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('success', 'Success', `${modalType.charAt(0).toUpperCase() + modalType.slice(1)} ${editingItem ? 'updated' : 'created'} successfully.`),
      })
    } catch (err) {
      setError(err.message)
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('error', 'Error', err.message),
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(type, id) {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return

    try {
      const res = await fetch(`${API}/hr/${type}s/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error(`Failed to delete ${type}`)

      await Promise.all([
        fetchStats(),
        fetchEmployees(),
        fetchDepartments(),
        fetchAttendance(),
        fetchLeaves(),
        fetchPayroll(),
        fetchHrUsers(),
      ])

      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('success', 'Success', `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`),
      })
    } catch (err) {
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('error', 'Error', err.message),
      })
    }
  }

  async function handleApproveLeave(leaveId) {
    try {
      const res = await fetch(`${API}/hr/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'Approved', approved_by: 'Admin' }),
      })
      if (!res.ok) throw new Error('Failed to approve leave')
      await fetchLeaves()
      await fetchStats()
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('success', 'Success', 'Leave approved successfully.'),
      })
    } catch (err) {
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('error', 'Error', err.message),
      })
    }
  }

  async function handleRejectLeave(leaveId) {
    try {
      const res = await fetch(`${API}/hr/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'Rejected', approved_by: 'Admin' }),
      })
      if (!res.ok) throw new Error('Failed to reject leave')
      await fetchLeaves()
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('success', 'Success', 'Leave rejected.'),
      })
    } catch (err) {
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('error', 'Error', err.message),
      })
    }
  }

  // ─── Computed ──────────────────────────────────────────────────────────────

  const departmentMap = useMemo(() => {
    const map = {}
    departments.forEach(d => { map[d.id] = d.name })
    return map
  }, [departments])

  const employeeMap = useMemo(() => {
    const map = {}
    employees.forEach(e => { map[e.id] = `${e.first_name} ${e.last_name}` })
    return map
  }, [employees])

  const filteredEmployees = useMemo(() => {
    if (!search) return employees
    const q = search.toLowerCase()
    return employees.filter(e =>
      `${e.first_name} ${e.last_name} ${e.email} ${e.position} ${e.employee_id}`.toLowerCase().includes(q)
    )
  }, [employees, search])

  const filteredLeaves = useMemo(() => {
    if (!leaveFilter) return leaves
    return leaves.filter(l => l.status === leaveFilter)
  }, [leaves, leaveFilter])

  const filteredAttendance = useMemo(() => {
    if (!attendanceFilter) return attendance
    return attendance.filter(a => a.status === attendanceFilter)
  }, [attendance, attendanceFilter])

  // ─── Render Helpers ────────────────────────────────────────────────────────

  function renderStatusBadge(status) {
    const colors = {
      'Active': { bg: 'rgba(34, 197, 94, 0.12)', color: '#15803d' },
      'Inactive': { bg: 'rgba(156, 163, 175, 0.12)', color: '#6b7280' },
      'On Leave': { bg: 'rgba(234, 179, 8, 0.12)', color: '#92400e' },
      'Terminated': { bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
      'Present': { bg: 'rgba(34, 197, 94, 0.12)', color: '#15803d' },
      'Absent': { bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
      'Late': { bg: 'rgba(234, 179, 8, 0.12)', color: '#92400e' },
      'Half Day': { bg: 'rgba(59, 130, 246, 0.12)', color: '#1d4ed8' },
      'Pending': { bg: 'rgba(234, 179, 8, 0.12)', color: '#92400e' },
      'Approved': { bg: 'rgba(34, 197, 94, 0.12)', color: '#15803d' },
      'Rejected': { bg: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' },
      'Paid': { bg: 'rgba(34, 197, 94, 0.12)', color: '#15803d' },
    }
    const c = colors[status] || { bg: 'rgba(156, 163, 175, 0.12)', color: '#6b7280' }
    return (
      <span style={{ padding: '4px 10px', borderRadius: '999px', backgroundColor: c.bg, color: c.color, fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {status}
      </span>
    )
  }

  function renderModal() {
    if (!isModalOpen) return null

    const modalWidth = modalType === 'employee' ? '600px' : '500px'
    const title = `${editingItem ? 'Edit' : 'Create'} ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px',
      }} onClick={closeModal}>
        <div style={{
          backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '28px',
          width: '100%', maxWidth: modalWidth, maxHeight: '90vh', overflowY: 'auto',
          border: '1px solid var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{title}</h3>
            <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {renderModalFields()}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" onClick={closeModal} style={{
                padding: '10px 20px', borderRadius: '999px', border: '1px solid var(--border-color)',
                backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500,
              }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{
                padding: '10px 20px', borderRadius: '999px', border: 'none',
                backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600,
                opacity: submitting ? 0.6 : 1,
              }}>
                {submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  function renderModalFields() {
    const fieldStyle = {
      width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem',
      outline: 'none', boxSizing: 'border-box',
    }
    const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }
    const rowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }

    switch (modalType) {
      case 'employee':
        return (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Employee ID *</label>
                <input style={fieldStyle} value={formData.employee_id} onChange={e => handleInputChange('employee_id', e.target.value)} required placeholder="EMP-001" />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={fieldStyle} value={formData.status} onChange={e => handleInputChange('status', e.target.value)}>
                  {employeeStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input style={fieldStyle} value={formData.first_name} onChange={e => handleInputChange('first_name', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input style={fieldStyle} value={formData.last_name} onChange={e => handleInputChange('last_name', e.target.value)} required />
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input style={fieldStyle} type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={fieldStyle} value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Position *</label>
                <input style={fieldStyle} value={formData.position} onChange={e => handleInputChange('position', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <select style={fieldStyle} value={formData.department_id} onChange={e => handleInputChange('department_id', e.target.value)}>
                  <option value="">No department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Salary</label>
                <input style={fieldStyle} type="number" step="0.01" value={formData.salary} onChange={e => handleInputChange('salary', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Hire Date</label>
                <input style={fieldStyle} type="date" value={formData.hire_date} onChange={e => handleInputChange('hire_date', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <textarea style={{ ...fieldStyle, minHeight: '60px', resize: 'vertical' }} value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Emergency Contact</label>
                <input style={fieldStyle} value={formData.emergency_contact} onChange={e => handleInputChange('emergency_contact', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Emergency Phone</label>
                <input style={fieldStyle} value={formData.emergency_phone} onChange={e => handleInputChange('emergency_phone', e.target.value)} />
              </div>
            </div>
          </div>
        )

      case 'department':
        return (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Department Name *</label>
              <input style={fieldStyle} value={formData.name} onChange={e => handleInputChange('name', e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...fieldStyle, minHeight: '80px', resize: 'vertical' }} value={formData.description} onChange={e => handleInputChange('description', e.target.value)} />
            </div>
          </div>
        )

      case 'attendance':
        return (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Employee *</label>
              <select style={fieldStyle} value={formData.employee_id} onChange={e => handleInputChange('employee_id', e.target.value)} required>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
              </select>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Date *</label>
                <input style={fieldStyle} type="date" value={formData.date} onChange={e => handleInputChange('date', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Status *</label>
                <select style={fieldStyle} value={formData.status} onChange={e => handleInputChange('status', e.target.value)}>
                  {attendanceStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Check In</label>
                <input style={fieldStyle} type="datetime-local" value={formData.check_in} onChange={e => handleInputChange('check_in', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Check Out</label>
                <input style={fieldStyle} type="datetime-local" value={formData.check_out} onChange={e => handleInputChange('check_out', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...fieldStyle, minHeight: '60px', resize: 'vertical' }} value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} />
            </div>
          </div>
        )

      case 'leave':
        return (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Employee *</label>
              <select style={fieldStyle} value={formData.employee_id} onChange={e => handleInputChange('employee_id', e.target.value)} required>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Leave Type *</label>
              <select style={fieldStyle} value={formData.leave_type} onChange={e => handleInputChange('leave_type', e.target.value)}>
                {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Start Date *</label>
                <input style={fieldStyle} type="date" value={formData.start_date} onChange={e => handleInputChange('start_date', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>End Date *</label>
                <input style={fieldStyle} type="date" value={formData.end_date} onChange={e => handleInputChange('end_date', e.target.value)} required />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Reason</label>
              <textarea style={{ ...fieldStyle, minHeight: '80px', resize: 'vertical' }} value={formData.reason} onChange={e => handleInputChange('reason', e.target.value)} />
            </div>
          </div>
        )

      case 'payroll':
        return (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Employee *</label>
              <select style={fieldStyle} value={formData.employee_id} onChange={e => handleInputChange('employee_id', e.target.value)} required>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
              </select>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Month *</label>
                <select style={fieldStyle} value={formData.month} onChange={e => handleInputChange('month', e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year *</label>
                <input style={fieldStyle} type="number" value={formData.year} onChange={e => handleInputChange('year', e.target.value)} required />
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Basic Salary *</label>
                <input style={fieldStyle} type="number" step="0.01" value={formData.basic_salary} onChange={e => handleInputChange('basic_salary', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={fieldStyle} value={formData.status} onChange={e => handleInputChange('status', e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Allowances</label>
                <input style={fieldStyle} type="number" step="0.01" value={formData.allowances} onChange={e => handleInputChange('allowances', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Deductions</label>
                <input style={fieldStyle} type="number" step="0.01" value={formData.deductions} onChange={e => handleInputChange('deductions', e.target.value)} />
              </div>
            </div>
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Net Salary</label>
                <input style={fieldStyle} type="number" step="0.01" value={formData.net_salary} onChange={e => handleInputChange('net_salary', e.target.value)} placeholder="Auto-calculated" />
              </div>
              <div>
                <label style={labelStyle}>Payment Date</label>
                <input style={fieldStyle} type="date" value={formData.payment_date} onChange={e => handleInputChange('payment_date', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...fieldStyle, minHeight: '60px', resize: 'vertical' }} value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} />
            </div>
          </div>
        )

      case 'user':
        return (
          <div style={{ display: 'grid', gap: '14px' }}>
            {!editingItem && (
              <div>
                <label style={labelStyle}>Employee *</label>
                <select style={fieldStyle} value={formData.employee_id} onChange={e => handleInputChange('employee_id', e.target.value)} required>
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={labelStyle}>Username *</label>
              <input style={fieldStyle} value={formData.username} onChange={e => handleInputChange('username', e.target.value)} required placeholder="e.g. john.doe" />
            </div>
            <div>
              <label style={labelStyle}>{editingItem ? 'New Password (leave blank to keep current)' : 'Password'} *</label>
              <input style={fieldStyle} type="password" value={formData.password} onChange={e => handleInputChange('password', e.target.value)} required={!editingItem} placeholder={editingItem ? 'Leave blank to keep current' : 'Enter password'} />
            </div>
            {!editingItem && (
              <div>
                <label style={labelStyle}>Role</label>
                <select style={fieldStyle} value={formData.role} onChange={e => handleInputChange('role', e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // ─── Tab Content ───────────────────────────────────────────────────────────

  function renderDashboard() {
    const statCards = [
      { label: 'Total Employees', value: stats.total_employees, icon: FaUsers, color: '#3b82f6' },
      { label: 'Departments', value: stats.total_departments, icon: FaBuilding, color: '#10b981' },
      { label: 'Pending Leaves', value: stats.pending_leaves, icon: FaHourglassHalf, color: '#f59e0b' },
      { label: 'Present Today', value: stats.today_attendance, icon: FaCheckCircle, color: '#22c55e' },
    ]

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {statCards.map((card, i) => (
            <div key={i} style={{
              backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '20px',
              border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                backgroundColor: card.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <card.icon style={{ fontSize: '1.3rem', color: card.color }} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>{card.value}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Recent Employees */}
          <div style={{
            backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '20px',
            border: '1px solid var(--border-color)',
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px' }}>Recent Employees</h4>
            {employees.slice(0, 5).length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No employees yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {employees.slice(0, 5).map(emp => (
                  <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{emp.first_name} {emp.last_name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{emp.position}</div>
                    </div>
                    <div>{renderStatusBadge(emp.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Leave Requests */}
          <div style={{
            backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '20px',
            border: '1px solid var(--border-color)',
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px' }}>Recent Leave Requests</h4>
            {leaves.slice(0, 5).length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No leave requests yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {leaves.slice(0, 5).map(leave => (
                  <div key={leave.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{employeeMap[leave.employee_id] || `Employee #${leave.employee_id}`}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{leave.leave_type} — {leave.start_date} to {leave.end_date}</div>
                    </div>
                    <div>{renderStatusBadge(leave.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderEmployees() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ position: 'relative', maxWidth: '320px', flex: 1 }}>
            <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.8rem', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employees..."
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              style={{
                width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px',
                border: '1px solid ' + (searchFocused ? 'var(--accent)' : 'var(--border-color)'),
                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
                boxShadow: searchFocused ? '0 0 0 3px rgba(0,149,246,0.15)' : 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
              }}
            />
          </div>
          <button onClick={() => openCreateModal('employee')} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>
            <FaUserPlus /> Add Employee
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Position</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Department</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No employees found.</td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{emp.employee_id}</td>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{emp.first_name} {emp.last_name}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{emp.email}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{emp.position}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{departmentMap[emp.department_id] || '—'}</td>
                    <td style={{ padding: '12px' }}>{renderStatusBadge(emp.status)}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEditModal('employee', emp)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px' }} title="Edit">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete('employee', emp.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Delete">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderDepartments() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{departments.length} department{departments.length !== 1 ? 's' : ''}</div>
          <button onClick={() => openCreateModal('department')} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>
            <FaPlus /> Add Department
          </button>
        </div>

        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {departments.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>No departments yet.</div>
          ) : (
            departments.map(dept => (
              <div key={dept.id} style={{
                backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '18px',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>{dept.name}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>{dept.description || 'No description'}</p>
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <FaUsers style={{ fontSize: '0.8rem' }} />
                      <span>{dept.head_count} employee{dept.head_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEditModal('department', dept)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px' }} title="Edit">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete('department', dept.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Delete">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  function renderAttendance() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <FaFilter style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} />
            <select value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value)} style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
            }}>
              <option value="">All Status</option>
              {attendanceStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={() => openCreateModal('attendance')} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>
            <FaPlus /> Record Attendance
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Employee</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Check In</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Check Out</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No attendance records found.</td>
                </tr>
              ) : (
                filteredAttendance.map(att => (
                  <tr key={att.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{employeeMap[att.employee_id] || `Employee #${att.employee_id}`}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{att.date}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{att.check_in ? new Date(att.check_in).toLocaleTimeString() : '—'}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{att.check_out ? new Date(att.check_out).toLocaleTimeString() : '—'}</td>
                    <td style={{ padding: '12px' }}>{renderStatusBadge(att.status)}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEditModal('attendance', att)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px' }} title="Edit">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete('attendance', att.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Delete">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderLeaves() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <FaFilter style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} />
            <select value={leaveFilter} onChange={e => setLeaveFilter(e.target.value)} style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
            }}>
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <button onClick={() => openCreateModal('leave')} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>
            <FaPlus /> New Leave Request
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Employee</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Start</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>End</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Reason</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No leave requests found.</td>
                </tr>
              ) : (
                filteredLeaves.map(leave => (
                  <tr key={leave.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{employeeMap[leave.employee_id] || `Employee #${leave.employee_id}`}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{leave.leave_type}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{leave.start_date}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{leave.end_date}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leave.reason || '—'}</td>
                    <td style={{ padding: '12px' }}>{renderStatusBadge(leave.status)}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {leave.status === 'Pending' && (
                          <>
                            <button onClick={() => handleApproveLeave(leave.id)} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', padding: '4px' }} title="Approve">
                              <FaCheck />
                            </button>
                            <button onClick={() => handleRejectLeave(leave.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Reject">
                              <FaTimes />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete('leave', leave.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Delete">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderPayroll() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{payrolls.length} record{payrolls.length !== 1 ? 's' : ''}</div>
          <button onClick={() => openCreateModal('payroll')} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>
            <FaPlus /> Add Payroll
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Employee</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Period</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Basic</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Allowances</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Deductions</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Net Salary</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No payroll records found.</td>
                </tr>
              ) : (
                payrolls.map(pay => (
                  <tr key={pay.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{employeeMap[pay.employee_id] || `Employee #${pay.employee_id}`}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{new Date(2000, pay.month - 1).toLocaleString('default', { month: 'short' })} {pay.year}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>${pay.basic_salary?.toLocaleString()}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>${pay.allowances?.toLocaleString()}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>${pay.deductions?.toLocaleString()}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>${pay.net_salary?.toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>{renderStatusBadge(pay.status)}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEditModal('payroll', pay)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px' }} title="Edit">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete('payroll', pay.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Delete">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderUsers() {
    const filteredUsers = hrUsers.filter(user => {
      const employeeName = employeeMap[user.employee_id] || ''
      const q = search.toLowerCase()
      return !q || `${employeeName} ${user.username} ${user.role}`.toLowerCase().includes(q)
    })

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{hrUsers.length} account{hrUsers.length !== 1 ? 's' : ''}</div>
          <button onClick={() => openCreateModal('user')} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>
            <FaPlus /> Create User
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Employee</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Username</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No user accounts found.</td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{employeeMap[user.employee_id] || `Employee #${user.employee_id}`}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{user.username}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{user.role}</td>
                    <td style={{ padding: '12px' }}>{renderStatusBadge(user.is_active ? 'Active' : 'Inactive')}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEditUserModal(user)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px' }} title="Edit credentials">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDelete('user', user.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Delete account">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)',
          padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ flex: 1, position: 'relative', maxWidth: '360px' }}>
            <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.8rem', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              style={{
                width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px',
                border: '1px solid ' + (searchFocused ? 'var(--accent)' : 'var(--border-color)'),
                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
                boxShadow: searchFocused ? '0 0 0 3px rgba(0,149,246,0.15)' : 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
          </div>
        </header>

        <div style={{ padding: '24px 24px 0' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Human Resources</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Manage employees, departments, attendance, leave requests, and payroll.
          </p>

          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
            {hrTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  border: '1px solid', borderColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                  backgroundColor: activeTab === tab.id ? 'rgba(0,149,246,0.12)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-primary)',
                  padding: '10px 16px', borderRadius: '999px', cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? 600 : 500, transition: 'all 0.2s ease',
                }}
              >
                <tab.icon style={{ fontSize: '0.9rem' }} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <main style={{ padding: '24px', flex: 1 }}>
          <div style={{
            backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '24px',
            border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          }}>
            {loading ? (
              <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader label="Loading HR data..." />
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'employees' && renderEmployees()}
                {activeTab === 'departments' && renderDepartments()}
                {activeTab === 'attendance' && renderAttendance()}
                {activeTab === 'leaves' && renderLeaves()}
                {activeTab === 'payroll' && renderPayroll()}
                {activeTab === 'users' && renderUsers()}
              </>
            )}
          </div>
        </main>
      </div>

      {renderModal()}
      <NotificationContainer notifications={notifications} dispatch={dispatchNotifications} />
    </div>
  )
}