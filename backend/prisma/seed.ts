import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Start seeding...')

    // Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 10)
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            password: adminPassword
        },
        create: {
            name: 'Matheus',
            username: 'admin',
            password: adminPassword,
            role: 'ADMIN'
        }
    })
    console.log('✅ Created admin user (admin/admin123)')

    // Create Customers
    const customers = [
        {
            name: 'João Silva',
            phone: '(11) 99999-1111',
            cpf: '111.111.111-11',
            debts: {
                create: [
                    // Old debt structure replaced by individual installments
                    // Sale 1: 3 installments of 250/3 = ~83.33. Let's start with a simpler example.
                    // Let's say Total 250. 
                    {
                        amount: 150.00,
                        originalAmount: 150.00,
                        remaining: 150.00,
                        installments: 1,
                        installmentNo: 1,
                        status: 'PENDING',
                        dueDate: new Date('2026-02-10'),
                        createdAt: new Date('2026-01-10')
                    },
                    {
                        amount: 180.00,
                        originalAmount: 180.00,
                        remaining: 180.00,
                        installments: 1,
                        installmentNo: 1,
                        status: 'OVERDUE',
                        dueDate: new Date('2025-11-15'), // Overdue for testing interest
                        createdAt: new Date('2025-10-15')
                    }
                ]
            }
        },
        {
            name: 'Maria Santos',
            phone: '(11) 99999-2222',
            cpf: '222.222.222-22',
            debts: {
                create: [
                    {
                        amount: 280.00,
                        originalAmount: 280.00,
                        remaining: 280.00,
                        installments: 1,
                        installmentNo: 1,
                        status: 'PENDING',
                        dueDate: new Date('2026-02-05'),
                        createdAt: new Date('2026-01-05')
                    }
                ]
            }
        },
        { name: 'Pedro Oliveira', phone: '(11) 99999-3333', cpf: '333.333.333-33' },
        {
            name: 'Ana Costa',
            phone: '(11) 99999-4444',
            cpf: '444.444.444-44',
            debts: {
                create: [
                    {
                        amount: 95.00,
                        originalAmount: 95.00,
                        remaining: 95.00,
                        installments: 1,
                        installmentNo: 1,
                        status: 'PENDING',
                        dueDate: new Date('2026-02-17'),
                        createdAt: new Date('2026-01-17')
                    }
                ]
            }
        },
        { name: 'Carlos Ferreira', phone: '(11) 99999-5555', cpf: '555.555.555-55' }
    ]

    for (const c of customers) {
        const customer = await prisma.customer.upsert({
            where: { cpf: c.cpf },
            update: {},
            create: {
                name: c.name,
                phone: c.phone,
                cpf: c.cpf,
                debts: c.debts as any
            }
        })
        console.log(`Created customer with id: ${customer.id}`)
    }

    console.log('✅ Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
