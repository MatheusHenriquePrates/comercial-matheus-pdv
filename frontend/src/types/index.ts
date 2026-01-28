export * from './product.types'
export * from './sale.types'
export * from './cashier.types'

// ===== USER TYPES =====

export type UserRole = 'admin' | 'operator'

export interface User {
    id: number
    username: string
    name: string
    role: UserRole
    active: boolean
}

export interface LoginCredentials {
    username: string
    password: string
}

export interface AuthResponse {
    user: User
    token: string
}
