export { }
const API_URL = 'http://localhost:3333'

async function main() {
    try {
        console.log(`Trying to login at ${API_URL}...`)

        // 1. Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        })

        if (!loginRes.ok) {
            console.error('Login Failed:', loginRes.status, await loginRes.text())
            return
        }

        const loginData = await loginRes.json()
        const { token } = loginData as any
        console.log('Login successful! Token received.')

        // 2. Fetch Customers
        console.log('Fetching customers...')
        const customersRes = await fetch(`${API_URL}/customers`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if (!customersRes.ok) {
            console.error('Customers Fetch Failed:', customersRes.status, await customersRes.text())
            return
        }

        const customersData = await customersRes.json()

        // Log results
        console.log('Customers Response Status:', customersRes.status)
        console.log('Customers Found:', Array.isArray(customersData) ? customersData.length : 'Not an array')
        if (Array.isArray(customersData) && customersData.length > 0) {
            console.log('First customer sample:', JSON.stringify(customersData[0], null, 2))
        } else {
            console.log('Data sample:', JSON.stringify(customersData, null, 2))
        }

    } catch (error: any) {
        console.error('Connection Error:', error.message)
    }
}

main()
