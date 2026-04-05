'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { adminFetch } from '../../../src/lib/api'
import { StatusBadge } from '../../../src/components/status-badge'

interface City {
  id: string
  name_en: string
  name_ar: string
  country: string
  is_active: boolean
}

interface CityFormData {
  name_en: string
  name_ar: string
  country: string
}

const COUNTRIES = [
  { code: 'AE', label: 'UAE' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'EG', label: 'Egypt' },
]

const SERVICE_CATEGORIES = [
  { key: 'car_wash', label: 'Car Wash' },
  { key: 'carpet', label: 'Carpet Cleaning' },
  { key: 'sofa', label: 'Sofa Cleaning' },
]

function emptyForm(): CityFormData {
  return { name_en: '', name_ar: '', country: 'AE' }
}

export default function CitiesPage() {
  const params = useParams()
  const _locale = (params?.locale as string) ?? 'en'

  const [cities, setCities] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Add city form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<CityFormData>(emptyForm())
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<CityFormData>(emptyForm())
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchCities = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminFetch<City[]>('/api/admin/cities')
      setCities(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cities')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCities()
  }, [fetchCities])

  async function handleAddCity() {
    setIsAdding(true)
    setAddError(null)
    try {
      const created = await adminFetch<City>('/api/admin/cities', {
        method: 'POST',
        body: JSON.stringify(addForm),
      })
      setCities((prev) => [...prev, created])
      setAddForm(emptyForm())
      setShowAddForm(false)
      setSuccessMessage('City added successfully.')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add city')
    } finally {
      setIsAdding(false)
    }
  }

  function startEdit(city: City) {
    setEditingId(city.id)
    setEditForm({ name_en: city.name_en, name_ar: city.name_ar, country: city.country })
    setEditError(null)
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setIsSaving(true)
    setEditError(null)
    try {
      const updated = await adminFetch<City>(`/api/admin/cities/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      })
      setCities((prev) => prev.map((c) => (c.id === editingId ? updated : c)))
      setEditingId(null)
      setSuccessMessage('City updated successfully.')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update city')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(cityId: string) {
    setIsDeleting(true)
    try {
      await adminFetch(`/api/admin/cities/${cityId}`, { method: 'DELETE' })
      setCities((prev) => prev.filter((c) => c.id !== cityId))
      setDeletingId(null)
      setSuccessMessage('City removed. Companies in this city are now hidden from discovery.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete city')
      setDeletingId(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-2xl max-w-4xl">
      {/* Notifications */}
      {error && (
        <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded">
          <p className="text-semantic-destructive text-body">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="border-s-4 border-semantic-success bg-semantic-success/5 px-md py-sm rounded flex items-center justify-between">
          <p className="text-semantic-success text-body">{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-label text-semantic-success hover:opacity-70"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ─── Cities Section ─── */}
      <section className="space-y-lg">
        <div className="flex items-center justify-between gap-md">
          <h1 className="text-heading font-semibold text-brand-navy">Cities</h1>
          <button
            type="button"
            onClick={() => { setShowAddForm((v) => !v); setAddError(null) }}
            className="px-md py-xs bg-brand-gold text-white font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors text-label"
          >
            Add City
          </button>
        </div>

        {/* Add City inline form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
            <h2 className="text-heading font-semibold text-brand-navy">New City</h2>
            {addError && (
              <p className="text-label text-semantic-destructive">{addError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <div>
                <label htmlFor="add-name-en" className="block text-label font-semibold text-gray-500 mb-xs">
                  Name (EN)
                </label>
                <input
                  id="add-name-en"
                  type="text"
                  value={addForm.name_en}
                  onChange={(e) => setAddForm((f) => ({ ...f, name_en: e.target.value }))}
                  className="w-full border border-brand-muted rounded-lg px-md py-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  placeholder="e.g. Dubai"
                />
              </div>
              <div>
                <label htmlFor="add-name-ar" className="block text-label font-semibold text-gray-500 mb-xs">
                  Name (AR)
                </label>
                <input
                  id="add-name-ar"
                  type="text"
                  dir="rtl"
                  value={addForm.name_ar}
                  onChange={(e) => setAddForm((f) => ({ ...f, name_ar: e.target.value }))}
                  className="w-full border border-brand-muted rounded-lg px-md py-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  placeholder="مثلاً: دبي"
                />
              </div>
              <div>
                <label htmlFor="add-country" className="block text-label font-semibold text-gray-500 mb-xs">
                  Country
                </label>
                <select
                  id="add-country"
                  value={addForm.country}
                  onChange={(e) => setAddForm((f) => ({ ...f, country: e.target.value }))}
                  className="w-full border border-brand-muted rounded-lg px-md py-sm text-body bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-sm">
              <button
                type="button"
                onClick={() => void handleAddCity()}
                disabled={isAdding || !addForm.name_en || !addForm.name_ar}
                className="px-lg py-sm bg-brand-gold text-white font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-40 text-label"
              >
                {isAdding ? 'Saving...' : 'Save City'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddForm(emptyForm()); setAddError(null) }}
                className="px-lg py-sm border border-brand-muted text-brand-navy font-semibold rounded-lg hover:bg-brand-muted/50 transition-colors text-label"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Cities table */}
        {isLoading ? (
          <div className="space-y-sm animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-brand-muted rounded" />
            ))}
          </div>
        ) : cities.length === 0 ? (
          <div className="text-center py-2xl">
            <p className="text-heading font-semibold text-gray-400">No cities configured.</p>
            <p className="text-body text-gray-400 mt-xs">Add a city to make companies discoverable.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-brand-muted">
            <table className="w-full text-label">
              <thead>
                <tr className="bg-brand-navy text-white">
                  <th className="px-md py-sm text-start font-semibold">Name (EN)</th>
                  <th className="px-md py-sm text-start font-semibold">Name (AR)</th>
                  <th className="px-md py-sm text-start font-semibold">Country</th>
                  <th className="px-md py-sm text-start font-semibold">Status</th>
                  <th className="px-md py-sm text-start font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city) => (
                  <tr key={city.id} className="border-t border-brand-muted">
                    <td className="px-md py-sm">
                      {editingId === city.id ? (
                        <input
                          type="text"
                          value={editForm.name_en}
                          onChange={(e) => setEditForm((f) => ({ ...f, name_en: e.target.value }))}
                          className="border border-brand-muted rounded px-sm py-xs text-body focus:outline-none focus:ring-2 focus:ring-brand-gold w-full"
                        />
                      ) : (
                        city.name_en
                      )}
                    </td>
                    <td className="px-md py-sm" dir="rtl">
                      {editingId === city.id ? (
                        <input
                          type="text"
                          dir="rtl"
                          value={editForm.name_ar}
                          onChange={(e) => setEditForm((f) => ({ ...f, name_ar: e.target.value }))}
                          className="border border-brand-muted rounded px-sm py-xs text-body focus:outline-none focus:ring-2 focus:ring-brand-gold w-full"
                        />
                      ) : (
                        city.name_ar
                      )}
                    </td>
                    <td className="px-md py-sm">
                      {editingId === city.id ? (
                        <select
                          value={editForm.country}
                          onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                          className="border border-brand-muted rounded px-sm py-xs text-body bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                          ))}
                        </select>
                      ) : (
                        COUNTRIES.find((c) => c.code === city.country)?.label ?? city.country
                      )}
                    </td>
                    <td className="px-md py-sm">
                      <StatusBadge
                        status={city.is_active ? 'approved' : 'rejected'}
                        label={city.is_active ? 'Active' : 'Inactive'}
                      />
                    </td>
                    <td className="px-md py-sm">
                      {editingId === city.id ? (
                        <div className="flex gap-xs">
                          {editError && (
                            <p className="text-label text-semantic-destructive">{editError}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleSaveEdit()}
                            disabled={isSaving}
                            className="px-sm py-xs bg-brand-gold text-white text-label font-semibold rounded hover:bg-brand-gold/90 transition-colors disabled:opacity-40"
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setEditError(null) }}
                            className="px-sm py-xs border border-brand-muted text-brand-navy text-label rounded hover:bg-brand-muted/50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-xs">
                          <button
                            type="button"
                            onClick={() => startEdit(city)}
                            className="px-sm py-xs border border-brand-muted text-brand-navy text-label rounded hover:bg-brand-muted/50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(city.id)}
                            className="px-sm py-xs border border-semantic-destructive text-semantic-destructive text-label rounded hover:bg-semantic-destructive/5 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Service Categories Section ─── */}
      <section className="space-y-lg">
        <h2 className="text-heading font-semibold text-brand-navy">Service Categories</h2>
        <div className="bg-white rounded-lg shadow-sm p-lg">
          <p className="text-label text-gray-500 mb-md">
            Service categories are platform-defined. Contact engineering to add new categories.
          </p>
          <div className="space-y-sm">
            {SERVICE_CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="flex items-center justify-between py-sm border-b border-brand-muted last:border-0"
              >
                <p className="text-body text-brand-navy">{cat.label}</p>
                <StatusBadge status="approved" label="Active" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Delete Confirmation Modal ─── */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-md bg-brand-navy/60"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-xl space-y-lg">
            <h2 className="text-heading font-semibold text-brand-navy">Delete City</h2>
            <p className="text-body text-gray-600">
              Delete city: This will hide all companies in this city from discovery. Confirm?
            </p>
            <div className="flex gap-md">
              <button
                type="button"
                onClick={() => void handleDelete(deletingId)}
                disabled={isDeleting}
                className="flex-1 px-lg py-sm bg-semantic-destructive text-white font-semibold rounded-lg hover:bg-semantic-destructive/90 transition-colors disabled:opacity-40"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="flex-1 px-lg py-sm border border-brand-muted text-brand-navy font-semibold rounded-lg hover:bg-brand-muted/50 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
