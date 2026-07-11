import React, { useEffect, useRef, useState, useMemo, useReducer } from 'react'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import Loader from '../components/Loader'
import NotificationContainer, { notificationReducer, createNotification } from '../components/NotificationContainer'
import PipelineManager from '../components/PipelineManager'
import { FaSearch, FaPlus, FaArrowRight, FaChevronDown, FaCog } from 'react-icons/fa'

const crmTabs = ['Contacts', 'Leads', 'Clients']
const REQUEST_TIMEOUT_MS = 8000

const defaultLeadPhases = [
  { id: 'phase-new', name: 'New', is_terminal: false },
  { id: 'phase-contacted', name: 'Contacted', is_terminal: false },
  { id: 'phase-proposal', name: 'Proposal', is_terminal: false },
  { id: 'phase-closed', name: 'Closed', is_terminal: true },
]

export default function Crm() {
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeTab, setActiveTab] = useState('Contacts')
  const [contacts, setContacts] = useState([])
  const [pipelines, setPipelines] = useState([])
  const [selectedPipelineId, setSelectedPipelineId] = useState(null)
  const [leadPhases, setLeadPhases] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    company_name: '',
    name: '',
    email: '',
    phone: '',
    description: '',
    status: 'New',
    stage: 'Lead',
  })
  const [loading, setLoading] = useState(false)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const [pipelineRefreshing, setPipelineRefreshing] = useState(false)
  const [pipelinesLoaded, setPipelinesLoaded] = useState(false)
  const [boardReady, setBoardReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [movingContactId, setMovingContactId] = useState(null)
  const [error, setError] = useState('')
  const [isCreateLeadHovered, setIsCreateLeadHovered] = useState(false)
  const [isPipelineDropdownOpen, setIsPipelineDropdownOpen] = useState(false)
  const [pipelineSettingsOpen, setPipelineSettingsOpen] = useState(false)
  const [leadPhaseMap, setLeadPhaseMap] = useState({})
  const [draggedLeadId, setDraggedLeadId] = useState(null)
  const [moveToLeadModalOpen, setMoveToLeadModalOpen] = useState(false)
  const [moveToLeadContact, setMoveToLeadContact] = useState(null)
  const [moveToLeadPipelineId, setMoveToLeadPipelineId] = useState(null)
  const [moveToLeadStatus, setMoveToLeadStatus] = useState('Contacted')
  const [moveToLeadDescription, setMoveToLeadDescription] = useState('')
  const [moveToLeadCompanyName, setMoveToLeadCompanyName] = useState('')
  const [moveToLeadJobTitle, setMoveToLeadJobTitle] = useState('')
  const [moveToLeadAddress, setMoveToLeadAddress] = useState('')
  const [moveToLeadTags, setMoveToLeadTags] = useState('')
  const [leadDetailModalOpen, setLeadDetailModalOpen] = useState(false)
  const [selectedLeadContact, setSelectedLeadContact] = useState(null)
  const [leadDetailFormData, setLeadDetailFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    description: '',
    job_title: '',
    address: '',
    tags: '',
    status: '',
  })
  const [leadDetailSubmitting, setLeadDetailSubmitting] = useState(false)
  const pipelineMenuRef = useRef(null)
  const [notifications, dispatchNotifications] = useReducer(notificationReducer, [])

  async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetch(url, { ...options, signal: controller.signal })
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  useEffect(() => {
    Promise.allSettled([fetchPipelines(true), fetchContacts()])
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (pipelineMenuRef.current && !pipelineMenuRef.current.contains(event.target)) {
        setIsPipelineDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    try {
      const savedMap = localStorage.getItem('lead-phase-map')
      if (savedMap) {
        setLeadPhaseMap(JSON.parse(savedMap))
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('lead-phase-map', JSON.stringify(leadPhaseMap))
  }, [leadPhaseMap])

  async function fetchPipelines(showBoardLoader = false) {
    if (showBoardLoader) {
      setPipelineRefreshing(true)
    }
    setBoardReady(false)
    try {
      const token = localStorage.getItem('token')
      const res = await fetchWithTimeout(`${import.meta.env.VITE_API_URL}/pipelines`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load pipelines')
      const data = await res.json()
      setPipelines(Array.isArray(data) ? data : [])
      setPipelinesLoaded(true)

      const resolvedSelectedPipelineId = (Array.isArray(data) ? data : []).some(pipeline => pipeline.id === selectedPipelineId)
        ? selectedPipelineId
        : (data[0]?.id ?? null)

      setSelectedPipelineId(resolvedSelectedPipelineId)
      const activePipeline = (Array.isArray(data) ? data : []).find(pipeline => pipeline.id === resolvedSelectedPipelineId) || data[0] || null
      const phases = (activePipeline?.phases?.length ? activePipeline.phases : defaultLeadPhases).map((phase, index) => ({
        ...phase,
        id: phase.id || `phase-${index}`,
      }))
      setLeadPhases(phases)
      setBoardReady(true)
      return data
    } catch (err) {
      console.error(err)
      setPipelines([])
      setPipelinesLoaded(true)
      setLeadPhases(defaultLeadPhases.map((phase, index) => ({ ...phase, id: phase.id || `phase-${index}` })))
      setBoardReady(true)
      return []
    } finally {
      if (showBoardLoader) {
        setPipelineRefreshing(false)
      }
    }
  }

  async function fetchContacts() {
    setContactsLoading(true)
    setContactsLoaded(false)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetchWithTimeout(`${import.meta.env.VITE_API_URL}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      }, 12000)
      if (!res.ok) throw new Error('Failed to load contacts')
      const data = await res.json()
      setContacts(Array.isArray(data) ? data : [])
      setContactsLoaded(true)
    } catch (err) {
      console.error(err)
      setContacts([])
      setContactsLoaded(true)
    } finally {
      setContactsLoading(false)
    }
  }

  const filteredContacts = useMemo(
    () => contacts.filter(contact =>
      [contact.name, contact.email, contact.phone, contact.description]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
    [contacts, search],
  )

  const defaultPipelineIdForLegacyLeads = useMemo(() => {
    const salesPipeline = pipelines.find(pipeline => /sales/i.test(pipeline.name)) || pipelines[0]
    return salesPipeline?.id ?? selectedPipelineId
  }, [pipelines, selectedPipelineId])

  const displayedContacts = useMemo(
    () => filteredContacts.filter(contact => {
      const contactsPipelineId = contact.pipeline_id

      if (activeTab === 'Contacts') {
        // Show ALL contacts in the Contacts tab, regardless of pipeline status
        return true
      }

      const matchesPipeline = contactsPipelineId == null
        ? Boolean(selectedPipelineId) && selectedPipelineId === defaultPipelineIdForLegacyLeads
        : Boolean(selectedPipelineId) && contactsPipelineId === selectedPipelineId

      if (activeTab === 'Leads') {
        return matchesPipeline && (contact.stage === 'Lead' || contact.status === 'Contacted')
      }
      if (activeTab === 'Clients') {
        return matchesPipeline && contact.is_client
      }
      return true
    }),
    [filteredContacts, activeTab, selectedPipelineId, defaultPipelineIdForLegacyLeads],
  )

  function handleOpenModal() {
    const isLeadModal = activeTab === 'Leads'
    setIsModalOpen(true)
    setFormData({
      company_name: '',
      name: '',
      email: '',
      phone: '',
      description: '',
      status: isLeadModal ? 'Contacted' : 'New',
      stage: isLeadModal ? 'Lead' : 'New',
    })

    if (isLeadModal) {
      const pipeline = pipelines.find(p => p.id === selectedPipelineId) || pipelines[0]
      if (pipeline) {
        setSelectedPipelineId(pipeline.id)
        const initialPhases = pipeline.phases?.length ? pipeline.phases : defaultLeadPhases
        setLeadPhases(initialPhases.map(phase => ({ ...phase, id: phase.id || `phase-${Date.now()}-${Math.random()}` })))
      }
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setFormData({ company_name: '', name: '', email: '', phone: '', description: '', status: 'New', stage: activeTab === 'Leads' ? 'Lead' : 'New' })
    const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
    setLeadPhases(selectedPipeline?.phases || [])
  }

  function handleInputChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreateContact(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const payload = {
        ...formData,
        ...(activeTab === 'Leads' ? { phases: leadPhases, pipeline_id: selectedPipelineId } : {}),
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.detail || 'Failed to create contact')
      }
      const created = await res.json()
      setContacts(prev => [created, ...prev])
      handleCloseModal()
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification(
          'success',
          'Success',
          activeTab === 'Leads' ? 'Lead created successfully.' : 'Contact created successfully.'
        ),
      })
    } catch (err) {
      setError(activeTab === 'Leads' ? 'Unable to create lead. Please try again.' : 'Unable to create contact. Please try again.')
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification(
          'error',
          'Error',
          activeTab === 'Leads' ? 'Failed to create lead. Please try again.' : 'Failed to create contact. Please try again.'
        ),
      })
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenMoveToLeadModal(contact) {
    setMoveToLeadContact(contact)
    setMoveToLeadPipelineId(selectedPipelineId || pipelines[0]?.id || null)
    setMoveToLeadStatus('Contacted')
    setMoveToLeadDescription(contact.description || '')
    setMoveToLeadCompanyName(contact.company_name || '')
    setMoveToLeadJobTitle(contact.job_title || '')
    setMoveToLeadAddress(contact.address || '')
    setMoveToLeadTags(Array.isArray(contact.tags) ? contact.tags.join(', ') : '')
    setMoveToLeadModalOpen(true)
  }

  function handleCloseMoveToLeadModal() {
    setMoveToLeadModalOpen(false)
    setMoveToLeadContact(null)
    setMoveToLeadPipelineId(null)
    setMoveToLeadDescription('')
    setMoveToLeadCompanyName('')
    setMoveToLeadJobTitle('')
    setMoveToLeadAddress('')
    setMoveToLeadTags('')
  }

  async function handleConfirmMoveToLeads(e) {
    e.preventDefault()
    if (!moveToLeadContact || !moveToLeadPipelineId) return
    setError('')
    setMovingContactId(moveToLeadContact.id)
    try {
      const token = localStorage.getItem('token')
      const tagsArray = moveToLeadTags
        ? moveToLeadTags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : []
      const res = await fetch(`${import.meta.env.VITE_API_URL}/contacts/${moveToLeadContact.id}/move-to-leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pipeline_id: moveToLeadPipelineId,
          status: moveToLeadStatus,
          description: moveToLeadDescription || null,
          company_name: moveToLeadCompanyName || null,
          job_title: moveToLeadJobTitle || null,
          address: moveToLeadAddress || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.detail || 'Failed to move contact')
      }
      const updated = await res.json()
      setContacts(prev => prev.map(contact => (contact.id === updated.id ? updated : contact)))
      handleCloseMoveToLeadModal()
      setActiveTab('Leads')
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('success', 'Success', 'Contact moved to leads successfully.'),
      })
    } catch (err) {
      setError('Unable to move contact to leads. Please try again.')
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('error', 'Error', 'Failed to move contact to leads. Please try again.'),
      })
    } finally {
      setMovingContactId(null)
    }
  }

  function getLeadPhaseIndex(contact) {
    if (leadPhaseMap[contact.id] !== undefined) {
      return leadPhaseMap[contact.id]
    }
    // Match contact's stage to the corresponding kanban phase by name
    const index = kanbanPhases.findIndex(p => p.name === contact.stage)
    return index >= 0 ? index : 0
  }

  function handleOpenLeadDetail(contact) {
    setSelectedLeadContact(contact)
    setLeadDetailFormData({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company_name: contact.company_name || '',
      description: contact.description || '',
      job_title: contact.job_title || '',
      address: contact.address || '',
      tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : (contact.tags || ''),
      status: contact.status || '',
    })
    setLeadDetailModalOpen(true)
  }

  function handleCloseLeadDetail() {
    setLeadDetailModalOpen(false)
    setSelectedLeadContact(null)
    setLeadDetailSubmitting(false)
  }

  function handleLeadDetailInputChange(field, value) {
    setLeadDetailFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleUpdateLead(e) {
    e.preventDefault()
    if (!selectedLeadContact) return
    setLeadDetailSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const tagsArray = leadDetailFormData.tags
        ? leadDetailFormData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : []
      const payload = {
        name: leadDetailFormData.name || undefined,
        email: leadDetailFormData.email || undefined,
        phone: leadDetailFormData.phone || undefined,
        company_name: leadDetailFormData.company_name || undefined,
        description: leadDetailFormData.description || undefined,
        job_title: leadDetailFormData.job_title || undefined,
        address: leadDetailFormData.address || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        status: leadDetailFormData.status || undefined,
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/contacts/${selectedLeadContact.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.detail || 'Failed to update lead')
      }
      const updated = await res.json()
      setContacts(prev => prev.map(c => (c.id === updated.id ? updated : c)))
      handleCloseLeadDetail()
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('success', 'Success', 'Lead updated successfully.'),
      })
    } catch (err) {
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('error', 'Error', err.message || 'Failed to update lead.'),
      })
    } finally {
      setLeadDetailSubmitting(false)
    }
  }

  async function handleDropToPhase(targetPhaseIndex) {
    if (draggedLeadId == null) return
    const contactId = draggedLeadId
    setDraggedLeadId(null)

    // Optimistic UI update: move the lead card immediately to the target phase
    const previousPhaseIndex = getLeadPhaseIndex(
      contacts.find(c => c.id === contactId) || {}
    )
    setLeadPhaseMap(prev => ({ ...prev, [contactId]: targetPhaseIndex }))

    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/contacts/${contactId}/phase`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase_index: targetPhaseIndex,
          pipeline_id: selectedPipelineId,
        }),
      })
      if (!res.ok) throw new Error('Failed to move lead')
      const updated = await res.json()

      // Backend confirmed — update contacts with fresh server data
      setContacts(prev => prev.map(c => (c.id === updated.id ? updated : c)))
      // Show success notification only after backend confirms
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('success', 'Success', 'Lead moved to new phase.'),
      })
    } catch (err) {
      console.error('Failed to move lead:', err)
      // Backend failed — revert the optimistic UI update
      setLeadPhaseMap(prev => ({ ...prev, [contactId]: previousPhaseIndex }))
      dispatchNotifications({
        type: 'ADD',
        payload: createNotification('error', 'Error', 'Failed to move lead. Changes have been reverted.'),
      })
    }
  }

  const selectedPipeline = useMemo(
    () => pipelines.find(pipeline => pipeline.id === selectedPipelineId),
    [pipelines, selectedPipelineId],
  )

  const kanbanPhases = useMemo(
    () => !boardReady
      ? []
      : (selectedPipeline?.phases?.length ? selectedPipeline.phases : leadPhases.length ? leadPhases : defaultLeadPhases).map((phase, index) => ({
          ...phase,
          id: phase.id || `phase-${index}`,
        })),
    [boardReady, selectedPipeline, leadPhases],
  )

  const leadContacts = useMemo(
    () => contacts.filter(contact => {
      const matchesPipeline = contact.pipeline_id == null
        ? Boolean(selectedPipelineId) && selectedPipelineId === defaultPipelineIdForLegacyLeads
        : Boolean(selectedPipelineId) && contact.pipeline_id === selectedPipelineId

      return matchesPipeline
    }),
    [contacts, selectedPipelineId, defaultPipelineIdForLegacyLeads],
  )

  const showLeadBoardLoader = activeTab === 'Leads' && (!boardReady || pipelineRefreshing)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-color)',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ flex: 1, position: 'relative', maxWidth: '360px' }}>
            <FaSearch
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                pointerEvents: 'none',
              }}
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                borderRadius: '8px',
                border: '1px solid ' + (searchFocused ? 'var(--accent)' : 'var(--border-color)'),
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                boxShadow: searchFocused ? '0 0 0 3px rgba(0,149,246,0.15)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
          </div>
        </header>

        <div style={{ padding: '24px 24px 0' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>CRM</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Manage your customer relationships.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            {crmTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  border: '1px solid',
                  borderColor: activeTab === tab ? 'var(--accent)' : 'transparent',
                  backgroundColor: activeTab === tab ? 'rgba(0,149,246,0.12)' : 'transparent',
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-primary)',
                  padding: '10px 18px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 600 : 500,
                  transition: 'all 0.2s ease',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <main style={{ padding: '24px', flex: 1 }}>
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '30px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ marginBottom: '12px', fontSize: '1.25rem', fontWeight: 700 }}>{activeTab}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  {activeTab === 'Contacts'
                    ? 'Track all leads and contacts with generated metadata and status updates.'
                    : activeTab === 'Leads'
                    ? 'Manage leads through your pipeline stages.'
                    : 'Review clients, accounts, and relationship history.'}
                </p>
              </div>
              {activeTab === 'Contacts' && (
                <button
                  onClick={handleOpenModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 18px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <FaPlus />
                  Add new contact
                </button>
              )}
              {activeTab === 'Leads' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div ref={pipelineMenuRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setIsPipelineDropdownOpen(prev => !prev)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.14)',
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        minWidth: '190px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.16)',
                      }}
                    >
                      <span>{pipelines.find(p => p.id === selectedPipelineId)?.name || 'Select pipeline'}</span>
                      <FaChevronDown style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.72)' }} />
                    </button>
                    {isPipelineDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          left: 0,
                          minWidth: '220px',
                          backgroundColor: 'rgba(15, 23, 42, 0.98)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '14px',
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.22)',
                          padding: '6px',
                          zIndex: 30,
                        }}
                      >
                        {pipelines.length === 0 ? (
                          <div style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>No pipelines available</div>
                        ) : (
                          pipelines.map(pipeline => (
                            <button
                              key={pipeline.id}
                              type="button"
                              onClick={() => {
                                setSelectedPipelineId(pipeline.id)
                                const phases = pipeline?.phases?.length ? pipeline.phases : defaultLeadPhases
                                setLeadPhases(phases.map(phase => ({ ...phase, id: phase.id || `phase-${Date.now()}-${Math.random()}` })))
                                setIsPipelineDropdownOpen(false)
                              }}
                              style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                              }}
                            >
                              {pipeline.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPipelineSettingsOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '999px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <FaCog />
                    Settings
                  </button>

                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={handleOpenModal}
                      onMouseEnter={() => setIsCreateLeadHovered(true)}
                      onMouseLeave={() => setIsCreateLeadHovered(false)}
                      title="Create lead"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '42px',
                        height: '42px',
                        borderRadius: '999px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                    >
                      <FaPlus />
                    </button>
                    {isCreateLeadHovered && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          right: 0,
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '999px',
                          padding: '6px 10px',
                          fontSize: '0.8rem',
                          color: 'var(--text-primary)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                        }}
                      >
                        Create lead
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'Contacts' && (
              <div style={{ marginTop: '24px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Name</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Email / Phone</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Description</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Stage</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Owner</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Created</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Updated</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '24px 12px', textAlign: 'center' }}>
                          <Loader label="Loading contacts..." />
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          {error}
                        </td>
                      </tr>
                    ) : displayedContacts.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No contacts found.
                        </td>
                      </tr>
                    ) : (
                      displayedContacts.map(contact => (
                        <tr key={contact.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '14px 12px' }}>{contact.company_name || '—'}</td>
                          <td style={{ padding: '14px 12px' }}>
                            <div style={{ fontWeight: 600 }}>{contact.name}</div>
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <div style={{ marginBottom: '4px' }}>{contact.email}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{contact.phone}</div>
                          </td>
                          <td style={{ padding: '14px 12px', maxWidth: '260px', color: 'var(--text-secondary)' }}>{contact.description}</td>
                          <td style={{ padding: '14px 12px' }}>
                            <span
                              style={{
                                padding: '6px 10px',
                                borderRadius: '999px',
                                backgroundColor: contact.status === 'Active' ? 'rgba(34, 197, 94, 0.12)' : contact.status === 'Contacted' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                                color: contact.status === 'Active' ? '#15803d' : contact.status === 'Contacted' ? '#1d4ed8' : '#92400e',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                              }}
                            >
                              {contact.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 12px' }}>{contact.stage}</td>
                          <td style={{ padding: '14px 12px' }}>{contact.owner}</td>
                          <td style={{ padding: '14px 12px' }}>{contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '—'}</td>
                          <td style={{ padding: '14px 12px' }}>{contact.updated_at ? new Date(contact.updated_at).toLocaleDateString() : '—'}</td>
                          <td style={{ padding: '14px 12px' }}>
                            {activeTab === 'Contacts' ? (
                              contact.pipeline_id != null ? (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>In pipeline</span>
                              ) : (
                                <button
                                  onClick={() => handleOpenMoveToLeadModal(contact)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    borderRadius: '999px',
                                    border: '1px solid var(--accent)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--accent)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  <FaArrowRight style={{ fontSize: '0.75rem' }} />
                                  Move to leads
                                </button>
                              )
                            ) : activeTab === 'Leads' ? (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Lead</span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === 'Leads' && (
              <div style={{ marginTop: '24px', display: 'grid', gap: '18px' }}>
                {showLeadBoardLoader ? (
                  <div
                    style={{
                      minHeight: '360px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <Loader label="Loading leads..." />
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'stretch',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        paddingBottom: '8px',
                      }}
                    >
                      {kanbanPhases.map((phase, phaseIndex) => {
                        const phaseLeads = leadContacts.filter(contact => getLeadPhaseIndex(contact) === phaseIndex)

                        return (
                          <div
                            key={phase.id}
                            onDragOver={event => event.preventDefault()}
                            onDrop={() => handleDropToPhase(phaseIndex)}
                            style={{
                              flex: '0 0 260px',
                              backgroundColor: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '16px',
                              padding: '14px',
                              minHeight: '220px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{phase.name}</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  {phase.is_terminal && (
                                    <span style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      borderRadius: '999px',
                                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                      color: '#b45309',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.03em',
                                    }}>
                                      Terminal
                                    </span>
                                  )}
                                  {phase.converts_to_client && (
                                    <span style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      borderRadius: '999px',
                                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                      color: '#047857',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.03em',
                                    }}>
                                      → Client
                                    </span>
                                  )}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '6px' }}>
                                  {phaseLeads.length} lead{phaseLeads.length === 1 ? '' : 's'}
                                </div>
                              </div>
                              <div
                                style={{
                                  flexShrink: 0,
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '999px',
                                  backgroundColor: phase.color || (phase.is_terminal ? '#f59e0b' : 'var(--accent)'),
                                  marginTop: '4px',
                                }}
                              />
                            </div>

                            <div style={{ display: 'grid', gap: '10px' }}>
                              {phaseLeads.length === 0 ? (
                                <div style={{ padding: '12px', borderRadius: '12px', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                                  Drop leads here
                                </div>
                              ) : (
                                phaseLeads.map(contact => (
                                  <div
                                    key={contact.id}
                                    draggable
                                    onDragStart={() => setDraggedLeadId(contact.id)}
                                    onDragEnd={() => setDraggedLeadId(null)}
                                    onClick={() => handleOpenLeadDetail(contact)}
                                    style={{
                                      backgroundColor: 'var(--bg-card)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '12px',
                                      padding: '12px',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                      cursor: 'grab',
                                      transition: 'box-shadow 0.2s, transform 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'
                                      e.currentTarget.style.transform = 'translateY(-1px)'
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                                      e.currentTarget.style.transform = 'translateY(0)'
                                    }}
                                  >
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>{contact.name}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '6px' }}>{contact.company_name || 'No company'}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{contact.email}</div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <PipelineManager
                      pipelines={pipelines}
                      settingsOpenExternal={pipelineSettingsOpen}
                      onSettingsOpenChange={setPipelineSettingsOpen}
                      onPipelinesChange={({ pipelines: nextPipelines, selectedPipelineId: nextSelectedPipelineId }) => {
                        setPipelines(nextPipelines)
                        if (nextSelectedPipelineId != null) {
                          setSelectedPipelineId(nextSelectedPipelineId)
                          const nextPipeline = nextPipelines.find(pipeline => pipeline.id === nextSelectedPipelineId)
                          const phases = (nextPipeline?.phases?.length ? nextPipeline.phases : defaultLeadPhases).map((phase, index) => ({
                            ...phase,
                            id: phase.id || `phase-${index}`,
                          }))
                          setLeadPhases(phases)
                        }
                      }}
                      onRefreshStateChange={setPipelineRefreshing}
                    />
                  </>
                )}
              </div>
            )}
            {activeTab === 'Clients' && (
              <div style={{ marginTop: '24px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Name</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Email / Phone</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Company</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Stage</th>
                      <th style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactsLoading ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px 12px', textAlign: 'center' }}>
                          <Loader label="Loading clients..." />
                        </td>
                      </tr>
                    ) : displayedContacts.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No clients yet. Move leads to a terminal phase with "Convert to client" enabled.
                        </td>
                      </tr>
                    ) : (
                      displayedContacts.map(contact => (
                        <tr key={contact.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '14px 12px', fontWeight: 600 }}>{contact.name}</td>
                          <td style={{ padding: '14px 12px' }}>
                            <div style={{ marginBottom: '4px' }}>{contact.email}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{contact.phone}</div>
                          </td>
                          <td style={{ padding: '14px 12px' }}>{contact.company_name || '—'}</td>
                          <td style={{ padding: '14px 12px' }}>
                            <span
                              style={{
                                padding: '6px 10px',
                                borderRadius: '999px',
                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                color: '#047857',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                              }}
                            >
                              Client
                            </span>
                          </td>
                          <td style={{ padding: '14px 12px' }}>{contact.stage}</td>
                          <td style={{ padding: '14px 12px' }}>{contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

          {isModalOpen && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '20px 16px',
              zIndex: 1000,
              overflowY: 'auto',
            }}>
              <div style={{
                width: '100%',
                maxWidth: '640px',
                maxHeight: 'calc(100vh - 40px)',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 24px 80px rgba(15,23,42,0.25)',
                border: '1px solid rgba(148,163,184,0.2)',
                boxSizing: 'border-box',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>{activeTab === 'Leads' ? 'Create new lead' : 'Create new contact'}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      {activeTab === 'Leads'
                        ? 'Capture lead details, assign a company, and manage lead phases before adding to contacts.'
                        : 'Add a new contact record with metadata and auto-generated details.'}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '6px',
                    }}
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleCreateContact} style={{ display: 'grid', gap: '14px' }}>
                  {error && (
                    <div style={{ padding: '14px 16px', borderRadius: '14px', backgroundColor: 'rgba(248, 113, 113, 0.12)', color: '#b91c1c', fontSize: '0.93rem' }}>
                      {error}
                    </div>
                  )}
                  <div style={{ display: 'grid', gap: '12px' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Name</label>
                          <input
                            value={formData.name}
                            onChange={e => handleInputChange('name', e.target.value)}
                            required
                            placeholder="Contact name"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Email</label>
                          <input
                            value={formData.email}
                            onChange={e => handleInputChange('email', e.target.value)}
                            required
                            placeholder="name@example.com"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Phone</label>
                          <input
                            value={formData.phone}
                            onChange={e => handleInputChange('phone', e.target.value)}
                            placeholder="+1 555 123 4567"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Description</label>
                          <textarea
                            value={formData.description}
                            onChange={e => handleInputChange('description', e.target.value)}
                            rows={4}
                            placeholder="Short description or contact notes"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              resize: 'vertical',
                            }}
                          />
                        </div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Status</label>
                          <select
                            value={formData.status}
                            onChange={e => handleInputChange('status', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <option>New</option>
                            <option>Contacted</option>
                            <option>Active</option>
                          </select>
                        </div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Company</label>
                          <input
                            value={formData.company_name}
                            onChange={e => handleInputChange('company_name', e.target.value)}
                            placeholder="Company name"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Stage</label>
                          <select
                            value={formData.stage}
                            onChange={e => handleInputChange('stage', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <option>Lead</option>
                            <option>Qualified</option>
                            <option>Proposal</option>
                            <option>Closed</option>
                          </select>
                        </div>
                        {activeTab === 'Leads' && (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Pipeline</label>
                            <select
                              value={selectedPipelineId || ''}
                              onChange={e => {
                                const pipelineId = parseInt(e.target.value)
                                if (isNaN(pipelineId)) return
                                setSelectedPipelineId(pipelineId)
                                const pipeline = pipelines.find(p => p.id === pipelineId)
                                const phases = pipeline?.phases?.length ? pipeline.phases : defaultLeadPhases
                                setLeadPhases(phases.map(phase => ({ ...phase, id: phase.id || `phase-${Date.now()}-${Math.random()}` })))
                              }}
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {pipelines.length === 0 && <option value="">No pipelines available</option>}
                              {pipelines.map(pipeline => (
                                <option key={pipeline.id} value={pipeline.id}>
                                  {pipeline.name}
                                </option>
                              ))}
                            </select>
                            {leadPhases.length > 0 && (
                              <div style={{ marginTop: '4px' }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                                  Lead will move through these phases:
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {leadPhases.map((phase, index) => (
                                    <span
                                      key={phase.id}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '999px',
                                        backgroundColor: `${phase.color || (phase.is_terminal ? '#f59e0b' : '#3b82f6')}20`,
                                        color: phase.color || (phase.is_terminal ? '#b45309' : '#1d4ed8'),
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        border: '1px solid',
                                        borderColor: `${phase.color || (phase.is_terminal ? '#f59e0b' : '#3b82f6')}40`,
                                      }}
                                    >
                                      {phase.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                          <button
                            type="button"
                            onClick={handleCloseModal}
                            style={{
                              padding: '12px 18px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'transparent',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                            }}
                            disabled={submitting}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            style={{
                              padding: '12px 18px',
                              borderRadius: '12px',
                              border: 'none',
                              backgroundColor: submitting ? 'rgba(0,149,246,0.65)' : 'var(--accent)',
                              color: '#fff',
                              cursor: submitting ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <>
                                <Loader label="" size={18} color="#ffffff" />
                                {activeTab === 'Leads' ? 'Creating lead...' : 'Creating contact...'}
                              </>
                            ) : (
                              activeTab === 'Leads' ? 'Create lead' : 'Create contact'
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

          {moveToLeadModalOpen && moveToLeadContact && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '20px 16px',
              zIndex: 1000,
              overflowY: 'auto',
            }}>
              <div style={{
                width: '100%',
                maxWidth: '540px',
                maxHeight: 'calc(100vh - 40px)',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 24px 80px rgba(15,23,42,0.25)',
                border: '1px solid rgba(148,163,184,0.2)',
                boxSizing: 'border-box',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>Move to leads</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      Convert this contact to a lead and assign them to a pipeline.
                    </p>
                  </div>
                  <button
                    onClick={handleCloseMoveToLeadModal}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '6px',
                    }}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleConfirmMoveToLeads} style={{ display: 'grid', gap: '14px' }}>
                  {/* Contact summary */}
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{moveToLeadContact.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {moveToLeadContact.email}{moveToLeadContact.phone ? ` · ${moveToLeadContact.phone}` : ''}
                    </div>
                    {moveToLeadContact.company_name && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
                        {moveToLeadContact.company_name}
                      </div>
                    )}
                  </div>

                  {/* Pipeline selection */}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Pipeline</label>
                    <select
                      value={moveToLeadPipelineId || ''}
                      onChange={e => {
                        const id = parseInt(e.target.value)
                        if (!isNaN(id)) setMoveToLeadPipelineId(id)
                      }}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {pipelines.length === 0 && <option value="">No pipelines available</option>}
                      {pipelines.map(pipeline => (
                        <option key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </option>
                      ))}
                    </select>
                    {moveToLeadPipelineId && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Lead will start in the first phase of the selected pipeline.
                      </div>
                    )}
                  </div>

                  {/* Company (optional) */}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Company <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                    <input
                      value={moveToLeadCompanyName}
                      onChange={e => setMoveToLeadCompanyName(e.target.value)}
                      placeholder="Company name"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  {/* Job Title (optional) */}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Job Title <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                    <input
                      value={moveToLeadJobTitle}
                      onChange={e => setMoveToLeadJobTitle(e.target.value)}
                      placeholder="Job title"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  {/* Address (optional) */}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Address <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                    <textarea
                      value={moveToLeadAddress}
                      onChange={e => setMoveToLeadAddress(e.target.value)}
                      rows={2}
                      placeholder="Address"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Status */}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Lead status</label>
                    <select
                      value={moveToLeadStatus}
                      onChange={e => setMoveToLeadStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="Contacted">Contacted</option>
                      <option value="New">New</option>
                      <option value="Qualified">Qualified</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Notes</label>
                    <textarea
                      value={moveToLeadDescription}
                      onChange={e => setMoveToLeadDescription(e.target.value)}
                      rows={3}
                      placeholder="Add notes about this lead..."
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Tags</label>
                    <input
                      value={moveToLeadTags}
                      onChange={e => setMoveToLeadTags(e.target.value)}
                      placeholder="Comma-separated tags (e.g. vip, partner, warm)"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={handleCloseMoveToLeadModal}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                      disabled={movingContactId === moveToLeadContact.id}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={movingContactId === moveToLeadContact.id || !moveToLeadPipelineId}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: (movingContactId === moveToLeadContact.id || !moveToLeadPipelineId) ? 'rgba(0,149,246,0.65)' : 'var(--accent)',
                        color: '#fff',
                        cursor: (movingContactId === moveToLeadContact.id || !moveToLeadPipelineId) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      {movingContactId === moveToLeadContact.id ? (
                        <>
                          <Loader label="" size={18} color="#ffffff" />
                          Moving...
                        </>
                      ) : (
                        'Move to leads'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {leadDetailModalOpen && selectedLeadContact && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '20px 16px',
              zIndex: 1000,
              overflowY: 'auto',
            }}>
              <div style={{
                width: '100%',
                maxWidth: '640px',
                maxHeight: 'calc(100vh - 40px)',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 24px 80px rgba(15,23,42,0.25)',
                border: '1px solid rgba(148,163,184,0.2)',
                boxSizing: 'border-box',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>Lead Details</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      View and edit lead information.
                    </p>
                  </div>
                  <button
                    onClick={handleCloseLeadDetail}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '6px',
                    }}
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleUpdateLead} style={{ display: 'grid', gap: '14px' }}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Name</label>
                    <input
                      value={leadDetailFormData.name}
                      onChange={e => handleLeadDetailInputChange('name', e.target.value)}
                      required
                      placeholder="Contact name"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Email</label>
                    <input
                      value={leadDetailFormData.email}
                      onChange={e => handleLeadDetailInputChange('email', e.target.value)}
                      required
                      placeholder="name@example.com"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Phone</label>
                    <input
                      value={leadDetailFormData.phone}
                      onChange={e => handleLeadDetailInputChange('phone', e.target.value)}
                      placeholder="+1 555 123 4567"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Company</label>
                    <input
                      value={leadDetailFormData.company_name}
                      onChange={e => handleLeadDetailInputChange('company_name', e.target.value)}
                      placeholder="Company name"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Job Title</label>
                    <input
                      value={leadDetailFormData.job_title}
                      onChange={e => handleLeadDetailInputChange('job_title', e.target.value)}
                      placeholder="Job title"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Address</label>
                    <textarea
                      value={leadDetailFormData.address}
                      onChange={e => handleLeadDetailInputChange('address', e.target.value)}
                      rows={2}
                      placeholder="Address"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Description</label>
                    <textarea
                      value={leadDetailFormData.description}
                      onChange={e => handleLeadDetailInputChange('description', e.target.value)}
                      rows={3}
                      placeholder="Short description or notes"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Status</label>
                    <select
                      value={leadDetailFormData.status}
                      onChange={e => handleLeadDetailInputChange('status', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option>New</option>
                      <option>Contacted</option>
                      <option>Active</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Tags</label>
                    <input
                      value={leadDetailFormData.tags}
                      onChange={e => handleLeadDetailInputChange('tags', e.target.value)}
                      placeholder="Comma-separated tags (e.g. vip, partner, warm)"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={handleCloseLeadDetail}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                      disabled={leadDetailSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '12px 18px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: leadDetailSubmitting ? 'rgba(0,149,246,0.65)' : 'var(--accent)',
                        color: '#fff',
                        cursor: leadDetailSubmitting ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                      disabled={leadDetailSubmitting}
                    >
                      {leadDetailSubmitting ? (
                        <>
                          <Loader label="" size={18} color="#ffffff" />
                          Saving...
                        </>
                      ) : (
                        'Save changes'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
      </div>
      <NotificationContainer notifications={notifications} dispatch={dispatchNotifications} />
    </div>
  )
}
