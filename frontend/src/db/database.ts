import Dexie, { Table } from 'dexie'
import { Sale, Product, CashierTransaction, User, Cashier } from '../types'

// Extended Sale interface with IndexedDB specific fields
export interface LocalSale extends Sale {
    id?: number
}

// Extended Product interface for local storage
export interface LocalProduct extends Product {
    localUpdatedAt?: Date
}

// Extended Cashier Transaction for local storage
export interface LocalTransaction extends CashierTransaction {
    id?: number
}

// ===== DATABASE CLASS =====

export class AppDatabase extends Dexie {
    sales!: Table<LocalSale>
    products!: Table<LocalProduct>
    cashiers!: Table<Cashier>
    transactions!: Table<LocalTransaction>
    users!: Table<User>

    constructor() {
        super('ComercialMatheusDB')

        this.version(1).stores({
            sales: '++id, localId, serverId, status, cashierId, operatorId, createdAt',
            products: 'id, barcode, name, category, active, updatedAt',
            cashiers: '++id, number, status, openedAt, closedAt',
            transactions: '++id, localId, serverId, cashierId, type, status, createdAt',
            users: 'id, username, role, active'
        })
    }
}

export const db = new AppDatabase()

// ===== DATABASE HELPERS =====

export const dbHelpers = {
    // Get pending sales count
    async getPendingSalesCount(): Promise<number> {
        return await db.sales.where('status').equals('pending').count()
    },

    // Get pending transactions count
    async getPendingTransactionsCount(): Promise<number> {
        return await db.transactions.where('status').equals('pending').count()
    },

    // Get total pending count
    async getTotalPendingCount(): Promise<number> {
        const salesCount = await this.getPendingSalesCount()
        const txCount = await this.getPendingTransactionsCount()
        return salesCount + txCount
    },

    // Save sale locally
    async saveSale(sale: LocalSale): Promise<number> {
        return await db.sales.add(sale)
    },

    // Update sale status
    async updateSaleStatus(id: number, status: 'pending' | 'synced' | 'error', serverId?: number): Promise<void> {
        await db.sales.update(id, {
            status,
            serverId,
            syncedAt: status === 'synced' ? new Date() : undefined,
        })
    },

    // Get pending sales
    async getPendingSales(): Promise<LocalSale[]> {
        return await db.sales.where('status').equals('pending').toArray()
    },

    // Save transaction locally
    async saveTransaction(transaction: LocalTransaction): Promise<number> {
        return await db.transactions.add(transaction)
    },

    // Update transaction status
    async updateTransactionStatus(id: number, status: 'pending' | 'synced', serverId?: number): Promise<void> {
        await db.transactions.update(id, {
            status,
            serverId,
            syncedAt: status === 'synced' ? new Date() : undefined,
        })
    },

    // Get pending transactions
    async getPendingTransactions(): Promise<LocalTransaction[]> {
        return await db.transactions.where('status').equals('pending').toArray()
    },

    // Update products cache
    async updateProductsCache(products: Product[]): Promise<void> {
        await db.products.bulkPut(products.map(p => ({ ...p, localUpdatedAt: new Date() })))
    },

    // Search products locally
    async searchProducts(query: string): Promise<LocalProduct[]> {
        const lowerQuery = query.toLowerCase()
        return await db.products
            .filter(p =>
                p.active &&
                (p.name.toLowerCase().includes(lowerQuery) ||
                    p.barcode.includes(query))
            )
            .limit(10)
            .toArray()
    },

    // Get product by barcode locally
    async getProductByBarcode(barcode: string): Promise<LocalProduct | undefined> {
        return await db.products.where('barcode').equals(barcode).first()
    },

    // Get all active products
    async getAllProducts(): Promise<LocalProduct[]> {
        return await db.products.where('active').equals(1).toArray()
    },

    // Clean up old synced data (older than 7 days)
    async cleanupOldData(daysOld: number = 7): Promise<void> {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysOld)

        // Remove old synced sales
        await db.sales
            .filter(sale =>
                sale.status === 'synced' &&
                !!sale.syncedAt &&
                new Date(sale.syncedAt) < cutoffDate
            )
            .delete()

        // Remove old synced transactions
        await db.transactions
            .filter(tx =>
                tx.status === 'synced' &&
                !!tx.syncedAt &&
                new Date(tx.syncedAt) < cutoffDate
            )
            .delete()

        console.log('Old synced data cleanup completed')
    },
}
