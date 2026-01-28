import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { calculateInterest } from '../utils/finance.js'

const router = Router()

// GET /customers - List all customers
router.get('/', authMiddleware, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            include: {
                debts: true
            },
            orderBy: { name: 'asc' }
        })

        console.log(`[GET /customers] Found ${customers.length} customers in DB`)

        // Calculate interest for each customer debt
        const customersWithInterest = customers.map(customer => ({
            ...customer,
            debts: customer.debts.map(debt => {
                const { interest, total, daysOverdue } = calculateInterest(debt.amount, debt.dueDate)
                return {
                    ...debt,
                    interest,
                    total, // Total with interest
                    daysOverdue
                }
            })
        }))

        res.json(customersWithInterest)
    } catch (error) {
        console.error('Get customers error:', error)
        res.status(500).json({ error: 'Erro ao buscar clientes' })
    }
})

// GET /customers/:id - Get customer details
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                debts: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sale: {
                            include: {
                                items: true
                            }
                        }
                    }
                }
            }
        })

        if (!customer) return res.status(404).json({ error: 'Cliente não encontrado' })

        // Calculate interest
        const debtsWithInterest = customer.debts.map(debt => {
            const { interest, total, daysOverdue } = calculateInterest(debt.amount, debt.dueDate)
            return {
                ...debt,
                interest,
                total,
                daysOverdue
            }
        })

        res.json({
            ...customer,
            debts: debtsWithInterest
        })
    } catch (error) {
        console.error('Get customer error:', error)
        res.status(500).json({ error: 'Erro ao buscar cliente' })
    }
})

// POST /customers - Create new customer
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, phone, cpf, address } = req.body

        if (!name) return res.status(400).json({ error: 'Nome é obrigatório' })

        const customer = await prisma.customer.create({
            data: {
                name,
                phone,
                cpf,
                address,
                birthDate: req.body.birthDate ? new Date(req.body.birthDate) : null,
                photoUrl: req.body.photoUrl
            }
        })

        res.status(201).json(customer)
    } catch (error) {
        console.error('Create customer error:', error)
        res.status(500).json({ error: 'Erro ao criar cliente' })
    }
})

// PUT /customers/:id - Update customer
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

        const { name, phone, cpf, address, birthDate, photoUrl } = req.body

        if (!name) return res.status(400).json({ error: 'Nome é obrigatório' })

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name,
                phone,
                cpf,
                address,
                birthDate: birthDate ? new Date(birthDate) : null,
                photoUrl
            }
        })

        res.json(customer)
    } catch (error) {
        console.error('Update customer error:', error)
        res.status(500).json({ error: 'Erro ao atualizar cliente' })
    }
})

export default router
