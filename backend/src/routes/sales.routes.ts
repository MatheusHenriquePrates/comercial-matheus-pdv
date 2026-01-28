import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js'

const router = Router()

// Map frontend payment methods to Prisma enums
const paymentMethodMap: Record<string, 'CASH' | 'DEBIT' | 'CREDIT' | 'PIX' | 'INSTALLMENT'> = {
    cash: 'CASH',
    debit: 'DEBIT',
    credit: 'CREDIT',
    pix: 'PIX',
    installment: 'INSTALLMENT'
}

// POST /sales - Create new sale
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { localId, items, subtotal, discount, total, paymentMethod, paymentDetails, cpf, delivery, cashierId, createdAt } = req.body

        // Validate required fields
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Itens são obrigatórios' })
        }

        // Helper date for queries
        const saleDate = createdAt ? new Date(createdAt) : new Date()

        // Transaction to ensure data integrity
        const sale = await prisma.$transaction(async (tx) => {
            // 1. Create Sale
            const newSale = await tx.sale.create({
                data: {
                    localId,
                    subtotal,
                    discount: discount || 0,
                    total,
                    paymentMethod: paymentMethodMap[paymentMethod] || 'CASH',
                    paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null,
                    cpf,
                    delivery: delivery ? JSON.stringify(delivery) : null,
                    cashierId: cashierId || 1,
                    operatorId: req.userId || 1,
                    createdAt: saleDate,
                    items: {
                        create: items.map((item: { productId?: number; description: string; quantity: number; unitPrice: number; subtotal: number }) => ({
                            productId: item.productId || null,
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            subtotal: item.subtotal,
                        }))
                    }
                },
                include: {
                    items: true
                }
            })

            // 2. Update stock
            for (const item of items) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: {
                                decrement: item.quantity
                            }
                        }
                    })
                }
            }

            // 3. Create Debt if method is INSTALLMENT
            if (paymentMethod === 'installment' && paymentDetails) {
                const details = typeof paymentDetails === 'string' ? JSON.parse(paymentDetails) : paymentDetails;

                if (details.customerId) {
                    const totalInstallments = details.installments || 1;
                    const baseAmount = Math.floor((total / totalInstallments) * 100) / 100; // Floor to 2 decimals
                    const remainder = Math.round((total - (baseAmount * totalInstallments)) * 100) / 100;

                    for (let i = 1; i <= totalInstallments; i++) {
                        const dueDate = new Date(saleDate);
                        dueDate.setDate(dueDate.getDate() + (30 * i));

                        // Add remainder to the first installment
                        const amount = i === 1 ? baseAmount + remainder : baseAmount;

                        await tx.debt.create({
                            data: {
                                customerId: details.customerId,
                                saleId: newSale.id,
                                amount: amount,
                                originalAmount: amount,
                                remaining: amount,
                                installments: totalInstallments,
                                installmentNo: i,
                                status: 'PENDING',
                                dueDate: dueDate,
                                createdAt: saleDate
                            }
                        })
                    }
                }
            }

            // 4. Create cashier transaction (Income)
            if (cashierId) {
                await tx.cashierTransaction.create({
                    data: {
                        cashierId,
                        type: 'SALE',
                        amount: total,
                        description: `Venda #${newSale.id}`,
                        createdAt: saleDate
                    }
                })
            }

            return newSale
        })

        res.status(201).json(sale)
    } catch (error) {
        console.error('Create sale error:', error)
        res.status(500).json({ error: 'Erro ao criar venda' })
    }
})

// GET /sales/daily-report - Get daily report stats
router.get('/daily-report', authMiddleware, async (req, res) => {
    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // 1. Get Sales
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow
                }
            },
            include: {
                items: true
            },
            orderBy: { createdAt: 'desc' }
        })

        // 2. Get Transactions (Withdrawals/Supplies)
        // We need to find the open cashier or all transactions for today
        // Assuming we want transactions for the day regardless of cashier session structure for now,
        // or getting from current open cashier. Let's get all transactions for today.
        const transactions = await prisma.cashierTransaction.findMany({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow
                }
            }
        })

        const withdrawals = transactions.filter(t => t.type === 'WITHDRAWAL')
        const supplies = transactions.filter(t => t.type === 'SUPPLY')

        // 3. Calculate Totals
        const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0)
        const totalWithdrawals = withdrawals.reduce((acc, t) => acc + t.amount, 0)
        const totalSupplies = supplies.reduce((acc, t) => acc + t.amount, 0)
        const netTotal = totalSales - totalWithdrawals + totalSupplies

        // 4. Format sales for the list
        const formattedSales = sales.map(sale => ({
            id: sale.id,
            time: new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            items: sale.items.length,
            total: sale.total,
            paymentMethod: sale.paymentMethod.toLowerCase()
        }))

        res.json({
            salesCount: sales.length,
            totalRevenue: totalSales,
            totalWithdrawals,
            totalSupplies,
            netTotal,
            sales: formattedSales
        })

    } catch (error) {
        console.error('Daily report error:', error)
        res.status(500).json({ error: 'Erro ao gerar relatório diário' })
    }
})

// GET /sales - List sales
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { cashierId, date } = req.query

        const where: Record<string, unknown> = {}

        if (cashierId) {
            where.cashierId = parseInt(cashierId as string)
        }

        if (date) {
            const startDate = new Date(date as string)
            const endDate = new Date(date as string)
            endDate.setDate(endDate.getDate() + 1)

            where.createdAt = {
                gte: startDate,
                lt: endDate
            }
        }

        const sales = await prisma.sale.findMany({
            where,
            include: {
                items: true,
                operator: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        res.json(sales)
    } catch (error) {
        console.error('Get sales error:', error)
        res.status(500).json({ error: 'Erro ao buscar vendas' })
    }
})

// GET /sales/:id - Get sale by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id)

        const sale = await prisma.sale.findUnique({
            where: { id },
            include: {
                items: true,
                operator: {
                    select: { name: true }
                }
            }
        })

        if (!sale) {
            return res.status(404).json({ error: 'Venda não encontrada' })
        }

        res.json(sale)
    } catch (error) {
        console.error('Get sale error:', error)
        res.status(500).json({ error: 'Erro ao buscar venda' })
    }
})

export default router
