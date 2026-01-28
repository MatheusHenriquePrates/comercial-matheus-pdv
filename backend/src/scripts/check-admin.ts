
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    try {
        const admin = await prisma.user.findUnique({
            where: { username: 'admin' }
        })

        if (admin) {
            console.log('✅ Admin user found:', admin.username)
            // Optional: Reset password to be sure
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash('admin123', salt)
            await prisma.user.update({
                where: { id: admin.id },
                data: { password: hashedPassword }
            })
            console.log('🔄 Admin password reset to: admin123')
        } else {
            console.log('⚠️ Admin user NOT found. Creating...')
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash('admin123', salt)

            await prisma.user.create({
                data: {
                    username: 'admin',
                    password: hashedPassword,
                    name: 'Administrador',
                    role: 'ADMIN',
                    active: true
                }
            })
            console.log('✅ Admin user created successfully.')
        }
    } catch (error) {
        console.error('❌ Error checking admin:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
