import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Cashier, CashierStatus } from '../types'

interface CashierState {
    currentCashier: Cashier | null
    status: CashierStatus

    // Actions
    setCashier: (cashier: Cashier) => void
    openCashier: (cashier: Cashier) => void
    closeCashier: () => void
    updateCashier: (data: Partial<Cashier>) => void
    clearCashier: () => void
}

export const useCashierStore = create<CashierState>()(
    persist(
        (set) => ({
            currentCashier: null,
            status: 'closed',

            setCashier: (cashier) => {
                set({
                    currentCashier: cashier,
                    status: cashier.status,
                })
            },

            openCashier: (cashier) => {
                set({
                    currentCashier: { ...cashier, status: 'open', openedAt: new Date() },
                    status: 'open',
                })
            },

            closeCashier: () => {
                set((state) => ({
                    currentCashier: state.currentCashier
                        ? { ...state.currentCashier, status: 'closed', closedAt: new Date() }
                        : null,
                    status: 'closed',
                }))
            },

            updateCashier: (data) => {
                set((state) => ({
                    currentCashier: state.currentCashier
                        ? { ...state.currentCashier, ...data }
                        : null,
                }))
            },

            clearCashier: () => {
                set({
                    currentCashier: null,
                    status: 'closed',
                })
            },
        }),
        {
            name: 'cashier-storage',
        }
    )
)
