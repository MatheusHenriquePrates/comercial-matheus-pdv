import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

// Validate JWT_SECRET at startup
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET não está definido nas variáveis de ambiente!')
    console.error('   Configure a variável JWT_SECRET no arquivo .env')
    process.exit(1)
}

export interface AuthRequest extends Request {
    userId?: number
    userRole?: string
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido' })
    }

    const [scheme, token] = authHeader.split(' ')

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Token mal formatado' })
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string }
        req.userId = decoded.userId
        req.userRole = decoded.role
        next()
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' })
    }
}

export function generateToken(userId: number, role: string): string {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '24h' })
}
