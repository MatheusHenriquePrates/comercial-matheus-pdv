// ===== SALE TYPES =====

export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'pix' | 'installment'

export interface SaleItem {
    productId?: number
    description: string
    quantity: number
    unitPrice: number
    subtotal: number
}

export interface PaymentDetails {
    // For cash
    amountReceived?: number
    change?: number

    // For installments
    customerId?: number
    customerName?: string
    installments?: number
    installmentValue?: number
    firstDueDate?: Date
    paidNow?: number
}

export interface DeliveryInfo {
    address?: string // For legacy/simple string address
    street?: string
    number?: string
    neighborhood?: string
    reference?: string
    fullAddress?: string
    observations?: string
}

export interface Sale {
    id?: number
    localId: string
    serverId?: number
    items: SaleItem[]
    subtotal: number
    discount: number
    total: number
    paymentMethod: PaymentMethod
    paymentDetails?: PaymentDetails
    cpf?: string
    delivery?: DeliveryInfo
    cashierId: number
    operatorId: number
    status: 'pending' | 'synced' | 'error'
    syncAttempts: number
    lastSyncError?: string
    createdAt: Date
    syncedAt?: Date
}

export interface SaleFormData {
    paymentMethod: PaymentMethod
    amountReceived?: number
    cpf?: string
    isDelivery?: boolean
    deliveryAddress?: string
    deliveryReference?: string
    deliveryObservations?: string
    // Installment fields
    customerId?: number
    customerName?: string
    installments?: number
    paidNow?: number
    firstDueDate?: string
}
