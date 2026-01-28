import { create } from 'zustand'

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error'

interface SyncState {
    status: SyncStatus
    isOnline: boolean
    pendingCount: number
    lastSyncAt: Date | null
    lastError: string | null

    // Actions
    setOnline: (value: boolean) => void
    setStatus: (status: SyncStatus) => void
    setPendingCount: (count: number) => void
    setSyncing: (isSyncing: boolean) => void
    setLastSync: (date: Date) => void
    setError: (error: string | null) => void
}

export const useSyncStore = create<SyncState>((set) => ({
    status: 'online',
    isOnline: true,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,

    setOnline: (value) => {
        set({
            isOnline: value,
            status: value ? 'online' : 'offline',
        })
    },

    setStatus: (status) => {
        set({ status })
    },

    setPendingCount: (count) => {
        set({ pendingCount: count })
    },

    setSyncing: (isSyncing) => {
        set((state) => ({
            status: isSyncing ? 'syncing' : state.isOnline ? 'online' : 'offline',
        }))
    },

    setLastSync: (date) => {
        set({ lastSyncAt: date, lastError: null })
    },

    setError: (error) => {
        set({ lastError: error, status: error ? 'error' : 'online' })
    },
}))
