import { create } from 'zustand'
import { SaleItem, Product } from '../types'

interface CartState {
    items: SaleItem[]
    subtotal: number
    discount: number
    total: number

    // Actions
    addItem: (product: Product | { description: string; price: number }, quantity?: number) => void
    updateQuantity: (index: number, quantity: number) => void
    removeItem: (index: number) => void
    clearCart: () => void
    applyDiscount: (discount: number) => void
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,

    addItem: (product, quantity = 1) => {
        set((state) => {
            const isProduct = 'id' in product
            const description = isProduct ? product.name : product.description
            const unitPrice = product.price

            // Check if product already exists in cart
            const existingIndex = state.items.findIndex((item) =>
                isProduct ? item.productId === product.id : item.description === description
            )

            let newItems: SaleItem[]

            if (existingIndex >= 0) {
                // Update quantity
                newItems = state.items.map((item, index) => {
                    if (index === existingIndex) {
                        const newQuantity = item.quantity + quantity
                        return {
                            ...item,
                            quantity: newQuantity,
                            subtotal: newQuantity * item.unitPrice,
                        }
                    }
                    return item
                })
            } else {
                // Add new item
                const newItem: SaleItem = {
                    productId: isProduct ? product.id : undefined,
                    description,
                    quantity,
                    unitPrice,
                    subtotal: quantity * unitPrice,
                }
                newItems = [...state.items, newItem]
            }

            const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0)
            const total = Math.max(0, subtotal - state.discount)

            return { items: newItems, subtotal, total }
        })
    },

    updateQuantity: (index, quantity) => {
        if (quantity <= 0) {
            get().removeItem(index)
            return
        }

        set((state) => {
            const newItems = state.items.map((item, i) => {
                if (i === index) {
                    return {
                        ...item,
                        quantity,
                        subtotal: quantity * item.unitPrice,
                    }
                }
                return item
            })

            const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0)
            const total = Math.max(0, subtotal - state.discount)

            return { items: newItems, subtotal, total }
        })
    },

    removeItem: (index) => {
        set((state) => {
            const newItems = state.items.filter((_, i) => i !== index)
            const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0)
            const total = Math.max(0, subtotal - state.discount)

            return { items: newItems, subtotal, total }
        })
    },

    clearCart: () => {
        set({
            items: [],
            subtotal: 0,
            discount: 0,
            total: 0,
        })
    },

    applyDiscount: (discount) => {
        set((state) => ({
            discount,
            total: Math.max(0, state.subtotal - discount),
        }))
    },
}))
