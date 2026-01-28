import { db, dbHelpers, LocalSale, LocalTransaction } from '../db/database'
import { productsAPI, salesAPI, cashierAPI, healthAPI } from './api'

import { useSyncStore } from '../store/useSyncStore'
import { SYNC_INTERVAL, CLEANUP_DAYS } from '../utils/constants'

class SyncService {
    private syncInterval: ReturnType<typeof setInterval> | null = null
    private isSyncing = false
    private isInitialized = false

    /**
     * Start automatic sync every 30 seconds
     */
    startAutoSync(): void {
        if (this.isInitialized) return

        this.isInitialized = true

        // Initial sync
        this.syncPendingData()

        // Periodic sync
        this.syncInterval = setInterval(() => {
            this.syncPendingData()
        }, SYNC_INTERVAL)

        // Cleanup old data once a day (on app start)
        dbHelpers.cleanupOldData(CLEANUP_DAYS)

        console.log('Auto sync started')
    }

    /**
     * Stop automatic sync
     */
    stopAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval)
            this.syncInterval = null
        }
        this.isInitialized = false
        console.log('Auto sync stopped')
    }

    /**
     * Check if API is available
     */
    async checkAPIAvailability(): Promise<boolean> {
        try {
            await healthAPI.check()
            return true
        } catch {
            return false
        }
    }

    /**
     * Sync all pending data
     */
    async syncPendingData(): Promise<void> {
        if (this.isSyncing) return

        this.isSyncing = true
        const { setOnline, setSyncing, setLastSync, setError } = useSyncStore.getState()

        try {
            // Check API availability
            const isOnline = await this.checkAPIAvailability()
            setOnline(isOnline)

            if (!isOnline) {
                console.log('API not available, skipping sync')
                await this.updatePendingCount()
                return
            }

            setSyncing(true)

            // Sync pending sales
            await this.syncPendingSales()

            // Sync pending transactions
            await this.syncPendingTransactions()

            // Update products cache from server
            await this.syncProductsFromServer()

            // Update last sync time
            setLastSync(new Date())
            setError(null)

        } catch (error) {
            console.error('Sync error:', error)
            setError(error instanceof Error ? error.message : 'Erro de sincronização')
        } finally {
            this.isSyncing = false
            setSyncing(false)
            await this.updatePendingCount()
        }
    }

    /**
     * Sync pending sales
     */
    private async syncPendingSales(): Promise<void> {
        const pendingSales = await dbHelpers.getPendingSales()

        for (const sale of pendingSales) {
            try {
                // Prepare sale data for API
                const saleData = {
                    localId: sale.localId,
                    items: sale.items,
                    subtotal: sale.subtotal,
                    discount: sale.discount,
                    total: sale.total,
                    paymentMethod: sale.paymentMethod,
                    paymentDetails: sale.paymentDetails,
                    cpf: sale.cpf,
                    delivery: sale.delivery,
                    cashierId: sale.cashierId,
                    operatorId: sale.operatorId,
                    createdAt: sale.createdAt,
                }

                const response = await salesAPI.create(saleData)

                // Update local record with server ID
                await dbHelpers.updateSaleStatus(sale.id!, 'synced', response.id)

                console.log(`Sale ${sale.localId} synced successfully`)
            } catch (error) {
                console.error(`Error syncing sale ${sale.localId}:`, error)

                // Increment sync attempts
                await db.sales.update(sale.id!, {
                    syncAttempts: (sale.syncAttempts || 0) + 1,
                    lastSyncError: error instanceof Error ? error.message : 'Unknown error',
                })
            }
        }
    }

    /**
     * Sync pending transactions (withdrawals/supplies)
     */
    private async syncPendingTransactions(): Promise<void> {
        const pendingTransactions = await dbHelpers.getPendingTransactions()

        for (const tx of pendingTransactions) {
            try {
                const response = await cashierAPI.createTransaction({
                    type: tx.type as 'withdrawal' | 'supply',
                    amount: tx.amount,
                    description: tx.description,
                    observations: tx.observations,
                })

                await dbHelpers.updateTransactionStatus(tx.id!, 'synced', response.id)

                console.log(`Transaction ${tx.localId} synced successfully`)
            } catch (error) {
                console.error(`Error syncing transaction ${tx.localId}:`, error)
            }
        }
    }

    /**
     * Sync products from server to local cache
     */
    private async syncProductsFromServer(): Promise<void> {
        try {
            const products = await productsAPI.getAll()
            await dbHelpers.updateProductsCache(products)
            console.log(`${products.length} products synced to local cache`)
        } catch (error) {
            console.error('Error syncing products:', error)
        }
    }

    /**
     * Update pending items count in store
     */
    private async updatePendingCount(): Promise<void> {
        const count = await dbHelpers.getTotalPendingCount()
        useSyncStore.getState().setPendingCount(count)
    }

    /**
     * Force immediate sync
     */
    async forceSyncNow(): Promise<void> {
        await this.syncPendingData()
    }

    /**
     * Save a sale locally and attempt sync
     * Returns both local ID and backend ID (if sync successful)
     */
    async saveSaleAndSync(sale: Omit<LocalSale, 'id'>): Promise<{ localId: number; backendId?: number }> {
        // Save locally first
        const localId = await dbHelpers.saveSale(sale as LocalSale)

        // Try to sync immediately and wait for result
        try {
            const response = await salesAPI.create({
                ...sale,
                id: undefined // Remove local ID
            })

            if (response && response.id) {
                // Update local sale with backend ID
                await dbHelpers.updateSaleStatus(localId, 'synced')
                return { localId, backendId: response.id }
            }
        } catch (error) {
            console.log('Sale saved locally, will sync later')
            setTimeout(() => this.syncPendingData(), 100)
        }

        return { localId }
    }

    /**
     * Save a transaction locally and attempt sync
     */
    async saveTransactionAndSync(transaction: Omit<LocalTransaction, 'id'>): Promise<number> {
        const localId = await dbHelpers.saveTransaction(transaction as LocalTransaction)

        setTimeout(() => this.syncPendingData(), 100)

        return localId
    }
}

export const syncService = new SyncService()
