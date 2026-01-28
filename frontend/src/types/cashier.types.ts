// ===== CASHIER TYPES =====

export type CashierStatus = 'open' | 'closed'
export type TransactionType = 'sale' | 'withdrawal' | 'supply'

export interface Cashier {
    id?: number
    number: number
    status: CashierStatus
    openedAt?: Date
    closedAt?: Date
    openingBalance: number
    expectedBalance?: number
    actualBalance?: number
    difference?: number
    observations?: string
    operatorId: number
    operatorName: string
}

export interface CashierTransaction {
    id?: number
    localId: string
    serverId?: number
    cashierId: number
    type: TransactionType
    amount: number
    description: string
    observations?: string
    status: 'pending' | 'synced'
    createdAt: Date
    syncedAt?: Date
}

export interface CashierSummary {
    openingBalance: number
    salesCash: number
    salesDebit: number
    salesCredit: number
    salesPix: number
    salesInstallment: number
    withdrawals: number
    supplies: number
    expectedBalance: number
}

export interface OpenCashierData {
    openingBalance: number
    observations?: string
}

export interface CloseCashierData {
    actualBalance: number
    observations?: string
}

export interface WithdrawalData {
    amount: number
    reason: 'supplier' | 'change' | 'expense' | 'other'
    observations?: string
}

export interface SupplyData {
    amount: number
    origin: 'change' | 'deposit' | 'refund' | 'other'
    observations?: string
}
