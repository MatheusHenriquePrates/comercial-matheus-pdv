// ===== PRODUCT TYPES =====

export interface Product {
    id: number
    barcode: string
    name: string
    description?: string
    price: number
    cost?: number
    unit: string
    stock: number
    minStock: number
    category: string
    image?: string
    active: boolean
    updatedAt: Date
}

export interface ProductSearchResult {
    id: number
    barcode: string
    name: string
    price: number
    unit: string
    stock: number
}
