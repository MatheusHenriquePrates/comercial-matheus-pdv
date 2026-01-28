import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.middleware.js'

const router = Router()

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios' })
        }

        const normalizedUsername = username.trim().toLowerCase()

        // Find user
        const user = await prisma.user.findUnique({
            where: { username: normalizedUsername }
        })

        if (!user) {
            // Note: Generic error message to prevent user enumeration
            return res.status(401).json({ error: 'Usuário ou senha inválidos' })
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password)

        if (!validPassword) {
            // Note: Generic error message to prevent credential guessing
            return res.status(401).json({ error: 'Usuário ou senha inválidos' })
        }

        // Check if user is active
        if (!user.active) {
            return res.status(401).json({ error: 'Usuário inativo' })
        }

        // Generate token
        const token = generateToken(user.id, user.role)

        // Return user and token
        res.json({
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role.toLowerCase(),
                active: user.active,
            },
            token,
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: 'Erro ao fazer login' })
    }
})

// GET /auth/verify - Verify token
router.get('/verify', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId }
        })

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado' })
        }

        res.json({
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role.toLowerCase(),
                active: user.active,
            }
        })
    } catch (error) {
        console.error('Verify error:', error)
        res.status(500).json({ error: 'Erro ao verificar token' })
    }
})

export default router
