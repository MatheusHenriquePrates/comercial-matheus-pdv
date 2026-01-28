import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react'
import { salesAPI, customersAPI } from '../../services/api'
import { formatCurrency } from '../../utils/formatters'
import toast from 'react-hot-toast'

export default function DashboardPage() {
    const navigate = useNavigate()
    const [stats, setStats] = useState({
        salesToday: 0,
        ordersCount: 0,
        activeCustomers: 0,
        avgTicket: 0
    })

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch daily sales report
                const report = await salesAPI.getDailyReport()

                // Fetch customers count
                const customers = await customersAPI.getAll()
                const activeCustomers = customers.length

                setStats({
                    salesToday: report.totalRevenue,
                    ordersCount: report.salesCount,
                    activeCustomers: activeCustomers,
                    avgTicket: report.salesCount > 0 ? report.totalRevenue / report.salesCount : 0
                })
            } catch (error) {
                console.error('Error loading dashboard:', error)
                toast.error('Erro ao carregar dados')
            }
        }

        fetchData()

        // Refresh every minute
        const interval = setInterval(fetchData, 60000)
        return () => clearInterval(interval)
    }, [])

    const statCards = [
        { label: 'Vendas Hoje', value: formatCurrency(stats.salesToday), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Total Pedidos', value: stats.ordersCount.toString(), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Clientes Ativos', value: stats.activeCustomers.toString(), icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
        { label: 'Ticket Médio', value: formatCurrency(stats.avgTicket), icon: TrendingUp, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Visão geral do seu negócio</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4 transition-colors">
                        <div className={`w-12 h-12 rounded-xl ${stat.bg} dark:bg-opacity-20 ${stat.color} dark:text-opacity-80 flex items-center justify-center`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
                <div className="relative z-10 max-w-lg">
                    <h2 className="text-3xl font-black mb-2">Carteira de Clientes</h2>
                    <p className="text-green-100 mb-6 font-medium">Gerencie seus clientes, visualize históricos e controle débitos de forma simples.</p>
                    <button
                        onClick={() => navigate('/management/customers')}
                        className="bg-white text-green-600 dark:text-green-700 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                        <Users className="w-5 h-5" /> Aceder Carteira
                    </button>
                </div>
                <Users className="absolute -right-10 -bottom-10 w-64 h-64 text-green-400/30 rotate-12" />
            </div>
        </div>
    )
}
