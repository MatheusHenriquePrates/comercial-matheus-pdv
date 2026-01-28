import axios from 'axios'
import { API_URL } from '../utils/constants'
import { useAuthStore } from '../store/useAuthStore'

// Create axios instance
export const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            useAuthStore.getState().logout()
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// ===== AUTH API =====

export const authAPI = {
    login: async (username: string, password: string) => {
        const response = await api.post('/auth/login', { username, password })
        return response.data
    },

    verifyToken: async () => {
        const response = await api.get('/auth/verify')
        return response.data
    },
}

// ===== PRODUCTS API =====

export const productsAPI = {
    getAll: async () => {
        const response = await api.get('/products?limit=1000')
        return response.data.products || response.data
    },

    search: async (query: string) => {
        const response = await api.get(`/products?search=${encodeURIComponent(query)}`)
        return response.data.products || response.data
    },

    getById: async (id: number) => {
        const response = await api.get(`/products/${id}`)
        return response.data
    },

    getByBarcode: async (barcode: string) => {
        const response = await api.get(`/products/barcode/${barcode}`)
        return response.data
    },
}

// ===== SALES API =====

export const salesAPI = {
    create: async (sale: unknown) => {
        const response = await api.post('/sales', sale)
        return response.data
    },

    getAll: async (params?: { cashierId?: number; date?: string }) => {
        const response = await api.get('/sales', { params })
        return response.data
    },

    getById: async (id: number) => {
        const response = await api.get(`/sales/${id}`)
        return response.data
    },

    getDailyReport: async () => {
        const response = await api.get('/sales/daily-report')
        return response.data
    },
}

// ===== CUSTOMERS API =====

export const customersAPI = {
    getAll: async () => {
        const response = await api.get('/customers')
        return response.data
    },

    getById: async (id: number) => {
        const response = await api.get(`/customers/${id}`)
        return response.data
    },

    create: async (data: any) => {
        const response = await api.post('/customers', data)
        return response.data
    },

    update: async (id: number, data: any) => {
        const response = await api.put(`/customers/${id}`, data)
        return response.data
    }
}

// ===== CASHIER API =====

export const cashierAPI = {
    getCurrent: async () => {
        const response = await api.get('/cashier/current')
        return response.data
    },

    open: async (data: { openingBalance: number; observations?: string }) => {
        const response = await api.post('/cashier/open', data)
        return response.data
    },

    close: async (data: { actualBalance: number; observations?: string }) => {
        const response = await api.post('/cashier/close', data)
        return response.data
    },

    getSummary: async (cashierId: number) => {
        const response = await api.get(`/cashier/${cashierId}/summary`)
        return response.data
    },

    createTransaction: async (data: {
        type: 'withdrawal' | 'supply'
        amount: number
        description: string
        observations?: string
    }) => {
        const response = await api.post('/cashier/transactions', data)
        return response.data
    },

    getTransactions: async (cashierId: number) => {
        const response = await api.get(`/cashier/${cashierId}/transactions`)
        return response.data
    },
}

// ===== DEBTS API =====

export const debtsAPI = {
    pay: async (id: number) => {
        const response = await api.post(`/debts/${id}/pay`)
        return response.data
    },

    registerPartialPayment: async (id: number, amount: number) => {
        const response = await api.post(`/debts/${id}/partial`, { amount })
        return response.data
    },

    payAll: async (customerId: number) => {
        const response = await api.post(`/debts/customer/${customerId}/pay-all`)
        return response.data
    }
}

// ===== HEALTH CHECK =====

export const healthAPI = {
    check: async () => {
        const response = await api.get('/health')
        return response.data
    },
}
