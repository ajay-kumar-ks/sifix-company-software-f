import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import Loader from '../components/Loader'
import { FaPlus, FaTrash, FaSave } from 'react-icons/fa'

const defaultPhaseForm = { name: '', is_terminal: false }

export default function Pipelines() {
  const [pipelines, setPipelines] = useState([])
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [editingPipelineName, setEditingPipelineName] = useState('')
  const [editingPipelineDescription, setEditingPipelineDescription] = useState('')
  const [phaseEdits, setPhaseEdits] = useState({})
  const [newPipelineName, setNewPipelineName] = useState('')
  const [phaseForm, setPhaseForm] = useState(defaultPhaseForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPipelines()
  }, [])

  useEffect(() => {
    if (selectedPipeline) {
      setEditingPipelineName(selectedPipeline.name)
      setEditingPipelineDescription(selectedPipeline.description || '')
      const edits = {}
      selectedPipeline.phases?.forEach(phase => {
        edits[phase.id] = { name: phase.name, is_terminal: phase.is_terminal }
      })
      setPhaseEdits(edits)
    }
  }, [selectedPipeline])

  async function fetchPipelines() {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/pipelines`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load pipelines')
      const data = await res.json()
      setPipelines(data)
      if (!selectedPipeline && data.length > 0) {
        setSelectedPipeline(data[0])
      } else if (selectedPipeline) {
        const updated = data.find(p => p.id === selectedPipeline.id)
        setSelectedPipeline(updated || data[0] || null)
      }
    } catch (err) {
      setError('Unable to load pipelines. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setModalOpen(true)
    setNewPipelineName('')
  }

  function closeCreateModal() {
    setModalOpen(false)
    setNewPipelineName('')
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newPipelineName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to create pipeline')
      await fetchPipelines()
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingPipelineName.trim(),
          description: editingPipelineDescription.trim(),
        }),
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: phaseForm.name.trim(), is_terminal: phaseForm.is_terminal }),
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: edit.name.trim(),
          is_terminal: edit.is_terminal,
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
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Pipelines</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Create and manage dynamic lead pipelines and their phases.</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
          </div>
        </header>

        <main style={{ padding: '24px', flex: 1 }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <section style={{ flex: 1, minWidth: '280px', maxWidth: '360px' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  padding: '22px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Pipelines</h2>
                  <button
                    onClick={openCreateModal}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '999px',
                      border: 'none',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <FaPlus />
                    New
                  </button>
                </div>

                {loading ? (
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <Loader label="Loading pipelines..." />
                  </div>
                ) : pipelines.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)' }}>No pipelines yet. Create one to get started.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {pipelines.map(pipeline => (
                      <button
                        key={pipeline.id}
                        onClick={() => setSelectedPipeline(pipeline)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '14px 16px',
                          borderRadius: '14px',
                          border: pipeline.id === selectedPipeline?.id ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                          backgroundColor: pipeline.id === selectedPipeline?.id ? 'rgba(0,149,246,0.08)' : 'transparent',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{pipeline.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{pipeline.phases?.length ?? 0} phases</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section style={{ flex: 2, minWidth: '360px' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  padding: '22px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                {!selectedPipeline ? (
                  <div style={{ color: 'var(--text-secondary)' }}>Select a pipeline to manage phases.</div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Pipeline name</label>
                        <input
                          value={editingPipelineName}
                          onChange={e => setEditingPipelineName(e.target.value)}
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
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Description</label>
                        <textarea
                          value={editingPipelineDescription}
                          onChange={e => setEditingPipelineDescription(e.target.value)}
                          rows={2}
                          placeholder="Describe the purpose of this pipeline..."
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
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={handleSavePipelineDetails}
                          disabled={saving || !!loading}
                          style={{
                            padding: '12px 18px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: 'var(--accent)',
                            color: '#fff',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <FaSave />
                          Save details
                        </button>
                        <button
                          onClick={() => handleDeletePipeline(selectedPipeline.id)}
                          disabled={saving || !!loading}
                          style={{
                            padding: '12px 18px',
                            borderRadius: '12px',
                            border: '1px solid #f87171',
                            backgroundColor: 'transparent',
                            color: '#f87171',
                            cursor: saving ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Delete pipeline
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div>
                        <div style={{ marginBottom: '10px', fontWeight: 600 }}>Pipeline phases</div>
                        {selectedPipeline.phases.length === 0 ? (
                          <div style={{ color: 'var(--text-secondary)' }}>No phases defined.</div>
                        ) : (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {selectedPipeline.phases.map(phase => (
                              <div
                                key={phase.id}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1.5fr 0.7fr 0.6fr 0.7fr',
                                  gap: '10px',
                                  alignItems: 'center',
                                  padding: '14px 16px',
                                  borderRadius: '14px',
                                  backgroundColor: 'var(--bg-secondary)',
                                  border: '1px solid var(--border-color)',
                                }}
                              >
                                <input
                                  value={phaseEdits[phase.id]?.name ?? phase.name}
                                  onChange={e => setPhaseEdits(prev => ({
                                    ...prev,
                                    [phase.id]: {
                                      ...prev[phase.id],
                                      name: e.target.value,
                                    },
                                  }))}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                  }}
                                />
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}>
                                  <input
                                    type="checkbox"
                                    checked={phaseEdits[phase.id]?.is_terminal ?? phase.is_terminal}
                                    onChange={e => setPhaseEdits(prev => ({
                                      ...prev,
                                      [phase.id]: {
                                        ...prev[phase.id],
                                        is_terminal: e.target.checked,
                                      },
                                    }))}
                                  />
                                  Terminal
                                </label>
                                <button
                                  onClick={() => handlePhaseSave(phase)}
                                  disabled={saving}
                                  style={{
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: 'var(--accent)',
                                    color: '#fff',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => handleDeletePhase(phase.id)}
                                  disabled={saving}
                                  style={{
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid #f87171',
                                    backgroundColor: 'transparent',
                                    color: '#f87171',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleAddPhase} style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          <label style={{ fontSize: '0.95rem', fontWeight: 600 }}>New phase name</label>
                          <input
                            value={phaseForm.name}
                            onChange={e => setPhaseForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Phase name"
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
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={phaseForm.is_terminal}
                            onChange={e => setPhaseForm(prev => ({ ...prev, is_terminal: e.target.checked }))}
                          />
                          Mark as terminal phase
                        </label>
                        <button
                          type="submit"
                          disabled={saving}
                          style={{
                            padding: '12px 18px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: 'var(--accent)',
                            color: '#fff',
                            cursor: saving ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Add phase
                        </button>
                      </form>
                    </div>
                  </>
                )}
                {error && (
                  <div style={{ marginTop: '18px', color: '#dc2626' }}>{error}</div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--bg-card)', borderRadius: '24px', padding: '24px', boxShadow: '0 24px 80px rgba(15,23,42,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Create pipeline</h3>
                <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>A default phase set will be added automatically.</p>
              </div>
              <button onClick={closeCreateModal} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>×</button>
            </div>
            <form onSubmit={handleCreatePipeline} style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gap: '8px' }}>
                <label style={{ fontWeight: 600 }}>Pipeline name</label>
                <input
                  value={newPipelineName}
                  onChange={e => setNewPipelineName(e.target.value)}
                  placeholder="My sales pipeline"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={closeCreateModal} style={{ padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '12px 18px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--accent)', color: '#fff' }}>{saving ? 'Creating...' : 'Create pipeline'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
