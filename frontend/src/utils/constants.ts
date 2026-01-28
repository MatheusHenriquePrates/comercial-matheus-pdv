// ===== CONSTANTS =====

/// <reference types="vite/client" />
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Comercial Matheus PDV'

// Sync interval in milliseconds (30 seconds)
export const SYNC_INTERVAL = 30000

// Data cleanup: remove synced data older than this (7 days)
export const CLEANUP_DAYS = 7

// Payment method labels
export const PAYMENT_METHOD_LABELS = {
    cash: 'Dinheiro',
    debit: 'Débito',
    credit: 'Crédito',
    pix: 'PIX',
    installment: 'A Prazo',
} as const

// Transaction type labels
export const TRANSACTION_LABELS = {
    sale: 'Venda',
    withdrawal: 'Sangria',
    supply: 'Suprimento',
} as const

// Withdrawal reasons
export const WITHDRAWAL_REASONS = {
    supplier: 'Pagamento de Fornecedor',
    change: 'Troco',
    expense: 'Despesa',
    other: 'Outro',
} as const

// Supply origins
export const SUPPLY_ORIGINS = {
    change: 'Troco',
    deposit: 'Depósito',
    refund: 'Devolução',
    other: 'Outro',
} as const

// Company info
export const COMPANY_INFO = {
    name: 'COMERCIAL MATHEUS',
    address: 'AVE JOAO MIRANDA DOS SANTOS, 181',
    city: 'PACAJA/PA',
    phone: '(91) 99102-9558',
    cnpj: 'XX.XXX.XXX/XXXX-XX',
} as const
