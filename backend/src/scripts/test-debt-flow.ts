
import { prisma } from '../lib/prisma.js'
import { calculateInterest } from '../utils/finance.js'
import { Prisma } from '@prisma/client'

async function runTest() {
    console.log('Starting Debt System Verification...')

    // 1. Setup Dependencies (User, Cashier)
    const operator = await prisma.user.upsert({
        where: { username: 'test_admin' },
        update: {},
        create: {
            username: 'test_admin',
            password: 'hashed_password',
            name: 'Test Admin',
            role: 'ADMIN'
        }
    })
    console.log(`Using Operator: ${operator.username} (ID: ${operator.id})`)

    const cashier = await prisma.cashier.create({
        data: {
            operatorId: operator.id,
            status: 'OPEN',
            openingBalance: 100
        }
    })
    console.log(`Created Cashier: ID ${cashier.id}`)

    // 1b. Create a Test Customer
    const customer = await prisma.customer.create({
        data: {
            name: 'Test Customer ' + Date.now(),
            cpf: '12345678900',
            phone: '11999999999'
        }
    })
    console.log(`Created Customer: ${customer.name} (ID: ${customer.id})`)

    // 2. Create a Sale with Installments
    // Sale of 1000.00 in 2 installments
    const saleAmount = 1000.00
    const installments = 2

    // Note: Sale in this schema doesn't seem to link directly to Customer? 
    // We will create it detached from customer but link debts to customer.
    const sale = await prisma.sale.create({
        data: {
            subtotal: saleAmount,
            total: saleAmount,
            paymentMethod: 'INSTALLMENT',
            items: {
                create: []
            },
            operatorId: operator.id,
            cashierId: cashier.id,
            cpf: customer.cpf // Link via CPF if possible
        }
    })
    console.log(`Created Sale: ID ${sale.id}`)

    const installmentAmount = saleAmount / installments

    for (let i = 1; i <= installments; i++) {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30 * i)

        await prisma.debt.create({
            data: {
                customerId: customer.id,
                saleId: sale.id,
                amount: installmentAmount,
                originalAmount: installmentAmount,
                remaining: installmentAmount,
                installments: installments,
                installmentNo: i,
                dueDate: dueDate,
                status: 'PENDING'
            }
        })
    }
    console.log('Created Debts for Sale')

    // 3. Verify Debts Created
    const debts = await prisma.debt.findMany({ where: { saleId: sale.id }, orderBy: { installmentNo: 'asc' } })
    if (debts.length !== 2) throw new Error('Incorrect number of debts created')
    console.log(`Verified ${debts.length} debts created.`)

    // 4. Simulate Overdue (Manually update DB)
    // Make 1st installment overdue by 10 days
    const debt1 = debts[0]
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10) // 10 days ago was due date

    await prisma.debt.update({
        where: { id: debt1.id },
        data: { dueDate: pastDate, status: 'OVERDUE' } // Manually setting status to match reality
    })
    console.log(`Simulated Overdue for Debt ${debt1.id}`)

    // 5. Verify Interest Calculation (using utility)
    const updatedDebt1 = await prisma.debt.findUnique({ where: { id: debt1.id } })
    if (!updatedDebt1) throw new Error('Debt not found')

    const interestCalc = calculateInterest(updatedDebt1.amount, updatedDebt1.dueDate)
    console.log(`Interest Calculation for 10 days overdue (Principal: ${updatedDebt1.amount}):`)
    console.log(`- Interest: ${interestCalc.interest}`)
    console.log(`- Total: ${interestCalc.total}`)
    console.log(`- Days Overdue: ${interestCalc.daysOverdue}`)

    if (interestCalc.daysOverdue !== 10) throw new Error(`Expected 10 days overdue, got ${interestCalc.daysOverdue}`)

    if (interestCalc.interest <= 0) throw new Error('Interest should be positive')


    // 6. Register Partial Payment (Haver) for Debt 1
    // Pay 100.00
    const payAmount = 100.00
    const newAmount = updatedDebt1.amount - payAmount

    // Simulate what the partial payment route does:
    await prisma.$transaction(async (tx) => {
        await tx.debtPayment.create({
            data: {
                debtId: debt1.id,
                amount: payAmount,
                description: 'Test Partial'
            }
        })

        await tx.debt.update({
            where: { id: debt1.id },
            data: {
                amount: newAmount,
                remaining: newAmount,
                status: 'PARTIAL'
            }
        })
    })
    console.log(`Registered Partial Payment of ${payAmount} for Debt ${debt1.id}`)

    const partialDebt = await prisma.debt.findUnique({ where: { id: debt1.id } })
    if (partialDebt?.remaining !== 400.00) throw new Error(`Expected remainig 400, got ${partialDebt?.remaining}`)

    // 7. Pay All remaining debts for customer
    // Should pay remaining of Debt 1 + Full Debt 2

    // Fetch all pending
    const pending = await prisma.debt.findMany({
        where: {
            customerId: customer.id,
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }
        }
    })
    console.log(`Pending debts before Pay All: ${pending.length}`)

    for (const d of pending) {
        // Calculate interest for final payment
        const { total, interest } = calculateInterest(d.amount, d.dueDate)

        // Create payment record
        await prisma.debtPayment.create({
            data: {
                debtId: d.id,
                amount: total,
                description: `Quitação Total`
            }
        })

        await prisma.debt.update({
            where: { id: d.id },
            data: { status: 'PAID', amount: 0, remaining: 0, interest: 0 }
        })
    }
    console.log('Executed Pay All')

    // 8. Final Verification
    const finalDebts = await prisma.debt.findMany({ where: { customerId: customer.id } })
    const allPaid = finalDebts.every(d => d.status === 'PAID' && d.remaining === 0)

    if (allPaid) {
        console.log('SUCCESS: All debts paid and verified!')
    } else {
        throw new Error('FAILURE: Not all debts are paid.')
    }
}

runTest()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
