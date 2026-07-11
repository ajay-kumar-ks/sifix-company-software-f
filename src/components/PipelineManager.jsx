import React, { useEffect, useState, useRef, useCallback } from 'react'
import Loader from './Loader'
import { FaPlus, FaSave, FaEdit, FaUserPlus, FaGripVertical, FaTrash, FaTimes, FaChevronLeft, FaChevronRight, FaPalette, FaCheck, FaArrowLeft } from 'react-icons/fa'

const defaultPhaseForm = { name: '', is_terminal: false, color: '#3b82f6', converts_to_client: false }
const phaseColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']

function PhaseColorControl({ value, onChange, buttonSize = 38 }) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={pickerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setShowPicker(prev => !prev)}
        title="Choose phase color"
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: '10px',
          border: '2px solid rgba(255,255,255,0.15)',
          backgroundColor: value || '#3b82f6',
          cursor: 'pointer',
          padding: 0,
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      />
      {showPicker && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 100,
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            minWidth: '160px',
          }}
        >
          {phaseColors.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => { onChange(color); setShowPicker(false) }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: value === color ? '2px solid #fff' : '2px solid transparent',
                backgroundColor: color,
                cursor: 'pointer',
                padding: 0,
                boxShadow: value === color ? '0 0 0 2px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
          <div style={{ gridColumn: '1 / -1', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Custom:</span>
            <input
              type="color"
              value={value || '#3b82f6'}
              onChange={e => onChange(e.target.value)}
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                padding: 0,
                background: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function PhaseRow({ phase, phaseIndex, totalPhases, phaseEdits, setPhaseEdits, onSave, onDelete, onMoveUp, onMoveDown, saving, dragState, onDragStart, onDragEnter, onDragOver, onDragEnd }) {
  const { dragIndex, dropIndex } = dragState
  const isDragging = dragIndex === phaseIndex
  const isDropTarget = dropIndex === phaseIndex && dragIndex !== null && dragIndex !== phaseIndex

  return (
    <div
      draggable
      onDragStart={() => onDragStart(phaseIndex)}
      onDragEnter={() => onDragEnter(phaseIndex)}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto auto',
        gap: '10px',
        alignItems: 'center',
        padding: '16px 18px',
        borderRadius: '16px',
        background: isDragging
          ? 'linear-gradient(135deg, rgba(0,149,246,0.12), rgba(0,149,246,0.06))'
          : isDropTarget
          ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))'
          : 'var(--bg-secondary)',
        border: isDropTarget
          ? '2px dashed #10b981'
          : isDragging
          ? '2px solid var(--accent)'
          : '1px solid var(--border-color)',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s ease',
        userSelect: 'none',
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : 'none',
      }}
    >
      {/* Drag handle + position number */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
        <FaGripVertical style={{ fontSize: '0.9rem', opacity: 0.5 }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '18px', textAlign: 'center', opacity: 0.6 }}>
          {phaseIndex + 1}
        </span>
      </div>

      {/* Name input + color */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            value={phaseEdits[phase.id]?.name ?? phase.name}
            onChange={e => setPhaseEdits(prev => ({
              ...prev,
              [phase.id]: { ...prev[phase.id], name: e.target.value },
            }))}
            placeholder="Phase name"
            style={{
              width: '100%',
              padding: '10px 14px 10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          />
        </div>
        <PhaseColorControl
          value={phaseEdits[phase.id]?.color || phase.color || '#3b82f6'}
          onChange={color => setPhaseEdits(prev => ({
            ...prev,
            [phase.id]: { ...prev[phase.id], color },
          }))}
          buttonSize={36}
        />
      </div>

      {/* Checkboxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={phaseEdits[phase.id]?.is_terminal ?? phase.is_terminal}
            onChange={e => setPhaseEdits(prev => ({
              ...prev,
              [phase.id]: { ...prev[phase.id], is_terminal: e.target.checked },
            }))}
            style={{ accentColor: 'var(--accent)' }}
          />
          Terminal
        </label>
        {(phaseEdits[phase.id]?.is_terminal ?? phase.is_terminal) && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={phaseEdits[phase.id]?.converts_to_client ?? phase.converts_to_client ?? false}
              onChange={e => {
                const isChecked = e.target.checked
                setPhaseEdits(prev => {
                  if (isChecked) {
                    const next = { ...prev }
                    Object.keys(next).forEach(id => {
                      next[id] = { ...next[id], converts_to_client: false }
                    })
                    next[phase.id] = { ...next[phase.id], converts_to_client: true }
                    return next
                  }
                  return { ...prev, [phase.id]: { ...prev[phase.id], converts_to_client: false } }
                })
              }}
              style={{ accentColor: '#10b981' }}
            />
            {phaseEdits[phase.id]?.converts_to_client ? (
              <span style={{ color: '#10b981', fontWeight: 600 }}>→ Client</span>
            ) : (
              '→ Client'
            )}
          </label>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          onClick={() => onMoveUp(phase.id)}
          disabled={saving || phaseIndex === 0}
          title="Move up"
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'transparent',
            color: phaseIndex === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
            cursor: saving || phaseIndex === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: phaseIndex === 0 ? 0.3 : 0.7,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { if (phaseIndex !== 0) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'var(--bg-card)' } }}
          onMouseLeave={e => { e.currentTarget.style.opacity = phaseIndex === 0 ? '0.3' : '0.7'; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <FaChevronLeft style={{ fontSize: '0.65rem' }} />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(phase.id)}
          disabled={saving || phaseIndex === totalPhases - 1}
          title="Move down"
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'transparent',
            color: phaseIndex === totalPhases - 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
            cursor: saving || phaseIndex === totalPhases - 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: phaseIndex === totalPhases - 1 ? 0.3 : 0.7,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { if (phaseIndex !== totalPhases - 1) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'var(--bg-card)' } }}
          onMouseLeave={e => { e.currentTarget.style.opacity = phaseIndex === totalPhases - 1 ? '0.3' : '0.7'; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <FaChevronRight style={{ fontSize: '0.65rem' }} />
        </button>
        <button
          onClick={() => onSave(phase)}
          disabled={saving}
          title="Save phase"
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            opacity: saving ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => { if (!saving) e.currentTarget.style.opacity = '1' }}
        >
          Save
        </button>
        <button
          onClick={() => onDelete(phase.id)}
          disabled={saving}
          title="Delete phase"
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid rgba(248,113,113,0.3)',
            backgroundColor: 'transparent',
            color: '#f87171',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: saving ? 0.4 : 0.7,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { if (!saving) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)' } }}
          onMouseLeave={e => { if (!saving) { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.backgroundColor = 'transparent' } }}
        >
          <FaTrash style={{ fontSize: '0.75rem' }} />
        </button>
      </div>
    </div>
  )
}

export default function PipelineManager({ pipelines: parentPipelines, settingsOpenExternal = false, onSettingsOpenChange = () => {}, onPipelinesChange = () => {}, onRefreshStateChange = () => {} }) {
  const [pipelines, setPipelines] = useState([])
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [editingPipelineName, setEditingPipelineName] = useState('')
  const [editingPipelineDescription, setEditingPipelineDescription] = useState('')
  const [phaseEdits, setPhaseEdits] = useState({})
  const [newPipelineName, setNewPipelineName] = useState('')
  const [newPipelineDescription, setNewPipelineDescription] = useState('')
  const [newPipelinePhases, setNewPipelinePhases] = useState([
    { id: 'phase-new', name: 'New', is_terminal: false },
    { id: 'phase-contacted', name: 'Contacted', is_terminal: false },
    { id: 'phase-proposal', name: 'Proposal', is_terminal: false },
    { id: 'phase-closed', name: 'Closed', is_terminal: true },
  ])
  const [newPhaseName, setNewPhaseName] = useState('')
  const [phaseForm, setPhaseForm] = useState(defaultPhaseForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [error, setError] = useState('')

  // Drag-and-drop state
  const [orderedPhases, setOrderedPhases] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)
  const [orderChanged, setOrderChanged] = useState(false)

  // Don't auto-fetch on mount — parent (Crm) already fetches pipelines.
  useEffect(() => {
    if (parentPipelines && parentPipelines.length > 0) {
      setPipelines(parentPipelines)
      const nextPipeline = parentPipelines.find(p => p.id === selectedPipeline?.id) || parentPipelines[0] || null
      if (nextPipeline) setSelectedPipeline(nextPipeline)
    }
  }, [])

  // Sync local pipelines whenever parent pipelines change
  useEffect(() => {
    if (parentPipelines && parentPipelines.length > 0) {
      setPipelines(parentPipelines)
      const nextPipeline = parentPipelines.find(p => p.id === selectedPipeline?.id) || parentPipelines[0] || null
      if (nextPipeline) setSelectedPipeline(nextPipeline)
    }
  }, [parentPipelines])

  useEffect(() => {
    if (selectedPipeline) {
      setEditingPipelineName(selectedPipeline.name)
      setEditingPipelineDescription(selectedPipeline.description || '')
      const edits = {}
      selectedPipeline.phases?.forEach(phase => {
        edits[phase.id] = { name: phase.name, is_terminal: phase.is_terminal, color: phase.color || '#3b82f6', converts_to_client: phase.converts_to_client || false }
      })
      setPhaseEdits(edits)
      setOrderedPhases([...selectedPipeline.phases].sort((a, b) => a.position - b.position))
      setOrderChanged(false)
    }
  }, [selectedPipeline])

  useEffect(() => {
    if (settingsOpenExternal !== undefined) setSettingsOpen(settingsOpenExternal)
  }, [settingsOpenExternal])

  function closeSettingsModal() {
    setSettingsOpen(false)
    setEditorOpen(false)
    setAssignModalOpen(false)
    onSettingsOpenChange(false)
  }

  async function fetchPipelines(preferredPipelineId = null) {
    setLoading(true)
    setError('')
    onRefreshStateChange(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pipelines`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load pipelines')
      const data = await res.json()
      setPipelines(data)
      const resolvedSelectedPipelineId = preferredPipelineId ?? (data.find(p => p.id === selectedPipeline?.id)?.id ?? data[0]?.id ?? null)
      const nextPipeline = data.find(p => p.id === resolvedSelectedPipelineId) || data[0] || null
      setSelectedPipeline(nextPipeline)
      onPipelinesChange({ pipelines: data, selectedPipelineId: resolvedSelectedPipelineId })
      return data
    } catch (err) {
      setError('Unable to load pipelines. Please try again.')
      return []
    } finally {
      setLoading(false)
      onRefreshStateChange(false)
    }
  }

  function openCreateModal() {
    setModalOpen(true)
    setNewPipelineName('')
    setNewPipelineDescription('')
    setNewPipelinePhases([
      { id: 'phase-new', name: 'New', is_terminal: false, color: '#3b82f6' },
      { id: 'phase-contacted', name: 'Contacted', is_terminal: false, color: '#10b981' },
      { id: 'phase-proposal', name: 'Proposal', is_terminal: false, color: '#f59e0b' },
      { id: 'phase-closed', name: 'Closed', is_terminal: true, color: '#ef4444' },
    ])
    setNewPhaseName('')
  }

  function closeCreateModal() {
    setModalOpen(false)
    setNewPipelineName('')
    setNewPipelineDescription('')
    setNewPipelinePhases([])
    setNewPhaseName('')
  }

  async function handleCreatePipeline(e) {
    e.preventDefault()
    if (!newPipelineName.trim()) return
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pipelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newPipelineName.trim(),
          description: newPipelineDescription.trim(),
          phases: newPipelinePhases.map(p => ({ name: p.name, is_terminal: p.is_terminal, color: p.color || '#3b82f6' })),
        }),
      })
      if (!res.ok) throw new Error('Failed to create pipeline')
      const createdPipeline = await res.json().catch(() => null)
      await fetchPipelines(createdPipeline?.id ?? null)
      closeCreateModal()
    } catch (err) {
      setError('Unable to create pipeline. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePipelineDetails() {
    if (!selectedPipeline || !editingPipelineName.trim()) return
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pipelines/${selectedPipeline.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editingPipelineName.trim(), description: editingPipelineDescription.trim() }),
      })
      if (!res.ok) throw new Error('Failed to save pipeline')
      const updated = await res.json()
      setSelectedPipeline(updated)
      await fetchPipelines()
    } catch (err) {
      setError('Unable to save pipeline. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePipeline(pipelineId) {
    if (!window.confirm('Delete this pipeline?')) return
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pipelines/${pipelineId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete pipeline')
      await fetchPipelines()
    } catch (err) {
      setError('Unable to delete pipeline. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddPhase(e) {
    e.preventDefault()
    if (!selectedPipeline || !phaseForm.name.trim()) return
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pipelines/${selectedPipeline.id}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: phaseForm.name.trim(), is_terminal: phaseForm.is_terminal, color: phaseForm.color || '#3b82f6', converts_to_client: phaseForm.converts_to_client }),
      })
      if (!res.ok) throw new Error('Failed to add phase')
      setPhaseForm(defaultPhaseForm)
      await fetchPipelines()
    } catch (err) {
      setError('Unable to add phase. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePhaseSave(phase) {
    const edit = phaseEdits[phase.id]
    if (!edit || !edit.name.trim()) return
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pipelines/${selectedPipeline.id}/phases/${phase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: edit.name.trim(),
          is_terminal: edit.is_terminal,
          color: edit.color || '#3b82f6',
          converts_to_client: edit.converts_to_client,
        }),
      })
      if (!res.ok) throw new Error('Failed to save phase')
      await fetchPipelines()
    } catch (err) {
      setError('Unable to save phase. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePhase(phaseId) {
    if (!selectedPipeline || !window.confirm('Delete this phase?')) return
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pipelines/${selectedPipeline.id}/phases/${phaseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete phase')
      await fetchPipelines()
    } catch (err) {
      setError('Unable to delete phase. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Drag-and-drop handlers
  function handleDragStart(index) { setDragIndex(index); setDropIndex(index) }
  function handleDragEnter(index) { setDropIndex(index) }
  function handleDragOver(e) { e.preventDefault() }

  function handleDragEnd() {
    if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) {
      setDragIndex(null); setDropIndex(null); return
    }
    const newOrder = [...orderedPhases]
    const [movedItem] = newOrder.splice(dragIndex, 1)
    newOrder.splice(dropIndex, 0, movedItem)
    setOrderedPhases(newOrder)
    setOrderChanged(true)
    setDragIndex(null); setDropIndex(null)
  }

  async function handleSaveOrder() {
    if (!selectedPipeline || !orderChanged) return
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const reorderPayload = { phases: orderedPhases.map((p, i) => ({ id: p.id, position: i })) }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pipelines/${selectedPipeline.id}/phases/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(reorderPayload),
      })
      if (!res.ok) throw new Error('Failed to reorder phases')
      setOrderChanged(false)
      await fetchPipelines()
    } catch (err) {
      setError('Unable to reorder phases. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleMoveUp(phaseId) {
    const idx = orderedPhases.findIndex(p => p.id === phaseId)
    if (idx <= 0) return
    const newOrder = [...orderedPhases]
    ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
    setOrderedPhases(newOrder)
    setOrderChanged(true)
  }

  async function handleMoveDown(phaseId) {
    const idx = orderedPhases.findIndex(p => p.id === phaseId)
    if (idx === -1 || idx >= orderedPhases.length - 1) return
    const newOrder = [...orderedPhases]
    ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
    setOrderedPhases(newOrder)
    setOrderChanged(true)
  }

  const isSettingsModalOpen = settingsOpenExternal !== undefined ? settingsOpenExternal : settingsOpen

  return (
    <div>
      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          backgroundColor: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.2)',
          color: '#f87171',
          marginBottom: '16px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <FaTimes style={{ fontSize: '0.85rem', flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px', zIndex: 50,
        }}>
          <div style={{
            width: '100%', maxWidth: '520px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '24px', padding: '32px',
            boxShadow: '0 24px 80px rgba(15,23,42,0.3)',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Pipeline Settings</h3>
              <button onClick={closeSettingsModal} style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '1.5rem', color: 'var(--text-secondary)',
                width: '36px', height: '36px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FaTimes />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {[
                { icon: <FaPlus style={{ fontSize: '1.6rem' }} />, label: 'Create', onClick: () => { setSettingsOpen(false); setAssignModalOpen(false); onSettingsOpenChange(false); openCreateModal() } },
                { icon: <FaEdit style={{ fontSize: '1.6rem' }} />, label: 'Edit', onClick: () => { setSettingsOpen(false); setAssignModalOpen(false); onSettingsOpenChange(false); setEditorOpen(true) } },
                { icon: <FaUserPlus style={{ fontSize: '1.6rem' }} />, label: 'Assign', onClick: () => { setSettingsOpen(false); setEditorOpen(false); onSettingsOpenChange(false); setAssignModalOpen(true) } },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.onClick}
                  style={{
                    borderRadius: '18px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '24px 16px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    gap: '12px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ color: 'var(--accent)' }}>{item.icon}</div>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {editorOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: '20px 16px', zIndex: 60, overflowY: 'auto',
        }}>
          <div style={{
            width: '100%', maxWidth: '820px',
            marginTop: '20px',
            maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '24px', padding: '32px',
            boxShadow: '0 24px 80px rgba(15,23,42,0.3)',
            border: '1px solid var(--border-color)',
            boxSizing: 'border-box',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Edit Pipeline</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Manage pipeline details, reorder phases by dragging, and configure phase properties.
                </p>
              </div>
              <button onClick={closeSettingsModal} style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '1.5rem', color: 'var(--text-secondary)',
                width: '36px', height: '36px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FaTimes />
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <Loader label="Loading pipelines..." />
              </div>
            ) : pipelines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <FaEdit style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: '12px' }} />
                <div>No pipelines yet. Create one to start organizing your leads.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Pipeline Selector */}
                <div style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  border: '1px solid var(--border-color)',
                }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                    Select Pipeline
                  </label>
                  <select
                    value={selectedPipeline?.id || ''}
                    onChange={e => {
                      const pipelineId = parseInt(e.target.value)
                      if (isNaN(pipelineId)) return
                      const pipeline = pipelines.find(p => p.id === pipelineId)
                      if (pipeline) setSelectedPipeline(pipeline)
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      outline: 'none',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 14px center',
                    }}
                  >
                    {pipelines.map(pipeline => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name} ({pipeline.phases?.length ?? 0} phases)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPipeline && (
                  <>
                    {/* Pipeline Details */}
                    <div style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1px solid var(--border-color)',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Pipeline Details
                      </div>
                      <div style={{ display: 'grid', gap: '14px' }}>
                        <div>
                          <label style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Name</label>
                          <input
                            value={editingPipelineName}
                            onChange={e => setEditingPipelineName(e.target.value)}
                            placeholder="Pipeline name"
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--text-primary)',
                              fontSize: '0.95rem',
                              outline: 'none',
                              transition: 'border-color 0.2s',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                          />
                        </div>
                        <div>
                          <label style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Description</label>
                          <textarea
                            value={editingPipelineDescription}
                            onChange={e => setEditingPipelineDescription(e.target.value)}
                            rows={2}
                            placeholder="Describe the purpose of this pipeline..."
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--text-primary)',
                              fontSize: '0.9rem',
                              resize: 'vertical',
                              outline: 'none',
                              transition: 'border-color 0.2s',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button
                            onClick={handleSavePipelineDetails}
                            disabled={saving}
                            style={{
                              padding: '11px 20px',
                              borderRadius: '12px',
                              border: 'none',
                              background: 'linear-gradient(135deg, var(--accent), #2563eb)',
                              color: '#fff',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              opacity: saving ? 0.6 : 1,
                              transition: 'all 0.2s ease',
                              boxShadow: '0 4px 12px rgba(0,149,246,0.25)',
                            }}
                            onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { if (!saving) e.currentTarget.style.transform = 'translateY(0)' }}
                          >
                            <FaSave />
                            Save Details
                          </button>
                          <button
                            onClick={() => handleDeletePipeline(selectedPipeline.id)}
                            disabled={saving}
                            style={{
                              padding: '11px 20px',
                              borderRadius: '12px',
                              border: '1px solid rgba(248,113,113,0.3)',
                              backgroundColor: 'transparent',
                              color: '#f87171',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              opacity: saving ? 0.4 : 1,
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => { if (!saving) { e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)'; e.currentTarget.style.borderColor = '#f87171' } }}
                            onMouseLeave={e => { if (!saving) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' } }}
                          >
                            <FaTrash />
                            Delete Pipeline
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Phases Section */}
                    <div style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1px solid var(--border-color)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Pipeline Phases
                          </div>
                          {orderChanged && (
                            <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '4px', fontWeight: 500 }}>
                              ⚡ Unsaved order changes
                            </div>
                          )}
                        </div>
                        {orderChanged && (
                          <button
                            onClick={handleSaveOrder}
                            disabled={saving}
                            style={{
                              padding: '10px 22px',
                              borderRadius: '12px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              opacity: saving ? 0.6 : 1,
                              transition: 'all 0.2s ease',
                              boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                            }}
                            onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={e => { if (!saving) e.currentTarget.style.transform = 'translateY(0)' }}
                          >
                            <FaSave />
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                        )}
                      </div>

                      {orderedPhases.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                          <FaGripVertical style={{ fontSize: '2rem', opacity: 0.2, marginBottom: '10px' }} />
                          <div>No phases defined for this pipeline.</div>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {orderedPhases.map((phase, phaseIndex) => (
                            <PhaseRow
                              key={phase.id}
                              phase={phase}
                              phaseIndex={phaseIndex}
                              totalPhases={orderedPhases.length}
                              phaseEdits={phaseEdits}
                              setPhaseEdits={setPhaseEdits}
                              onSave={handlePhaseSave}
                              onDelete={handleDeletePhase}
                              onMoveUp={handleMoveUp}
                              onMoveDown={handleMoveDown}
                              saving={saving}
                              dragState={{ dragIndex, dropIndex }}
                              onDragStart={handleDragStart}
                              onDragEnter={handleDragEnter}
                              onDragOver={handleDragOver}
                              onDragEnd={handleDragEnd}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Phase Form */}
                    <div style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1px solid var(--border-color)',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Add New Phase
                      </div>
                      <form onSubmit={handleAddPhase} style={{ display: 'grid', gap: '14px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Phase Name</label>
                            <input
                              value={phaseForm.name}
                              onChange={e => setPhaseForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g. Discovery Call"
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                              }}
                              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            />
                          </div>
                          <PhaseColorControl
                            value={phaseForm.color || '#3b82f6'}
                            onChange={color => setPhaseForm(prev => ({ ...prev, color }))}
                            buttonSize={42}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            <input
                              type="checkbox"
                              checked={phaseForm.is_terminal}
                              onChange={e => setPhaseForm(prev => ({ ...prev, is_terminal: e.target.checked, converts_to_client: e.target.checked ? prev.converts_to_client : false }))}
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            Terminal phase
                          </label>
                          {phaseForm.is_terminal && (
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              <input
                                type="checkbox"
                                checked={phaseForm.converts_to_client}
                                onChange={e => setPhaseForm(prev => ({ ...prev, converts_to_client: e.target.checked }))}
                                style={{ accentColor: '#10b981' }}
                              />
                              Convert to client
                            </label>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={saving}
                          style={{
                            padding: '12px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, var(--accent), #2563eb)',
                            color: '#fff',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            opacity: saving ? 0.6 : 1,
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(0,149,246,0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                          }}
                          onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)' }}
                          onMouseLeave={e => { if (!saving) e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                          <FaPlus />
                          Add Phase
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Pipeline Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: '20px 16px', zIndex: 50, overflowY: 'auto',
        }}>
          <div style={{
            width: '100%', maxWidth: '620px',
            marginTop: '40px',
            maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '24px', padding: '32px',
            boxShadow: '0 24px 80px rgba(15,23,42,0.3)',
            border: '1px solid var(--border-color)',
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Create Pipeline</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Set up a new pipeline with a description and custom phases.
                </p>
              </div>
              <button onClick={closeCreateModal} style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '1.5rem', color: 'var(--text-secondary)',
                width: '36px', height: '36px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleCreatePipeline} style={{ display: 'grid', gap: '18px' }}>
              <div>
                <label style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Pipeline Name</label>
                <input
                  value={newPipelineName}
                  onChange={e => setNewPipelineName(e.target.value)}
                  required
                  placeholder="e.g. Sales pipeline"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                />
              </div>
              <div>
                <label style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Description</label>
                <textarea
                  value={newPipelineDescription}
                  onChange={e => setNewPipelineDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the purpose of this pipeline..."
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Pipeline Phases
                </label>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {newPipelinePhases.map((phase, index) => (
                    <div key={phase.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center',
                      padding: '14px 16px', borderRadius: '14px',
                      backgroundColor: phase.is_terminal ? 'rgba(245,158,11,0.06)' : 'rgba(59,130,246,0.06)',
                      border: '1px solid var(--border-color)',
                    }}>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            value={phase.name}
                            onChange={e => setNewPipelinePhases(prev => prev.map(p => p.id === phase.id ? { ...p, name: e.target.value } : p))}
                            placeholder="Phase name"
                            style={{
                              flex: 1, padding: '10px 12px', borderRadius: '10px',
                              border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)',
                              color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                            }}
                          />
                          <PhaseColorControl
                            value={phase.color || '#3b82f6'}
                            onChange={color => setNewPipelinePhases(prev => prev.map(p => p.id === phase.id ? { ...p, color } : p))}
                            buttonSize={36}
                          />
                        </div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={phase.is_terminal}
                            onChange={e => setNewPipelinePhases(prev => prev.map(p => p.id === phase.id ? { ...p, is_terminal: e.target.checked } : p))}
                            style={{ accentColor: 'var(--accent)' }}
                          />
                          Terminal phase
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewPipelinePhases(prev => prev.filter(p => p.id !== phase.id))}
                        disabled={newPipelinePhases.length <= 1}
                        style={{
                          padding: '10px 12px', borderRadius: '10px',
                          border: '1px solid rgba(248,113,113,0.3)',
                          backgroundColor: 'transparent', color: '#f87171',
                          cursor: newPipelinePhases.length <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem', opacity: newPipelinePhases.length <= 1 ? 0.3 : 0.7,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => { if (newPipelinePhases.length > 1) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.08)' } }}
                        onMouseLeave={e => { if (newPipelinePhases.length > 1) { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.backgroundColor = 'transparent' } }}
                      >
                        <FaTrash style={{ fontSize: '0.75rem' }} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                  <input
                    value={newPhaseName}
                    onChange={e => setNewPhaseName(e.target.value)}
                    placeholder="New phase name"
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: '10px',
                      border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newPhaseName.trim()) return
                      setNewPipelinePhases(prev => [...prev, { id: `phase-${Date.now()}-${Math.random()}`, name: newPhaseName.trim(), is_terminal: false }])
                      setNewPhaseName('')
                    }}
                    style={{
                      padding: '10px 16px', borderRadius: '10px',
                      border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                      color: 'var(--text-primary)', cursor: 'pointer',
                      whiteSpace: 'nowrap', fontWeight: 500, fontSize: '0.9rem',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  >
                    <FaPlus style={{ fontSize: '0.75rem', marginRight: '6px' }} />
                    Add
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={closeCreateModal} style={{
                  padding: '12px 20px', borderRadius: '12px',
                  border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                  color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
                  transition: 'all 0.15s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{
                  padding: '12px 24px', borderRadius: '12px', border: 'none',
                  background: saving ? 'rgba(0,149,246,0.6)' : 'linear-gradient(135deg, var(--accent), #2563eb)',
                  color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,149,246,0.25)',
                }}
                  onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { if (!saving) e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {saving ? 'Creating...' : 'Create Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModalOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px', zIndex: 50,
        }}>
          <div style={{
            width: '100%', maxWidth: '420px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '24px', padding: '32px',
            boxShadow: '0 24px 80px rgba(15,23,42,0.3)',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Assign Pipeline</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Assign a lead owner to this pipeline.
                </p>
              </div>
              <button onClick={() => setAssignModalOpen(false)} style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '1.5rem', color: 'var(--text-secondary)',
                width: '36px', height: '36px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FaTimes />
              </button>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Assigned Owner</label>
                <input
                  placeholder="Team member or role"
                  disabled
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)', fontSize: '0.9rem',
                  }}
                />
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                style={{
                  padding: '12px 20px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, var(--accent), #2563eb)',
                  color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(0,149,246,0.25)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}