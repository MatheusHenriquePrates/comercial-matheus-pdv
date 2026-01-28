import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Users, LogOut, Menu, ChevronLeft, Moon, Sun,
    FileText, Package, Database, Receipt
} from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { useThemeStore } from '../../store/useThemeStore'

export default function ManagementLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, logout } = useAuthStore()
    const { theme, toggleTheme } = useThemeStore()
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/management' },
        { icon: Users, label: 'Carteira de Clientes', path: '/management/customers' },
        { icon: Package, label: 'Produtos', path: '/management/products' },
        { icon: FileText, label: 'Importar NFE', path: '/management/import-nfe' },
        { icon: Database, label: 'Banco de Estoque', path: '/management/stock' },
        { icon: Receipt, label: 'Configuração Fiscal', path: '/management/fiscal-config' },
    ]

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-200">
            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 border-r border-transparent dark:border-gray-700
                    ${isSidebarOpen ? 'w-64' : 'w-20'}
                `}
            >
                {/* Logo Area */}
                <div className="h-20 flex items-center justify-center border-b border-gray-100 dark:border-gray-700 transition-colors">
                    {isSidebarOpen ? (
                        <div className="text-center">
                            <h1 className="text-xl font-black text-green-600 dark:text-green-500 leading-none">Comercial</h1>
                            <h1 className="text-xl font-black text-yellow-500 dark:text-yellow-400 leading-none">Matheus</h1>
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">
                            CM
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`
                                    w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                                    ${isActive
                                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
                                    }
                                `}
                                title={!isSidebarOpen ? item.label : undefined}
                            >
                                <item.icon className={`w-6 h-6 ${isActive ? 'text-green-600' : ''}`} />
                                {isSidebarOpen && <span className="font-bold">{item.label}</span>}
                            </button>
                        )
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 transition-colors">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full flex items-center gap-3 p-3 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-green-700 dark:hover:text-green-400 rounded-xl transition-all mb-2"
                        title={!isSidebarOpen ? "Voltar ao Início" : undefined}
                    >
                        <ChevronLeft className="w-6 h-6" />
                        {isSidebarOpen && <span className="font-bold">Voltar ao Início</span>}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all"
                        title={!isSidebarOpen ? "Sair" : undefined}
                    >
                        <LogOut className="w-6 h-6" />
                        {isSidebarOpen && <span className="font-bold">Sair</span>}
                    </button>
                </div>
            </aside>

            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {/* Header */}
                <header className="h-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm transition-colors">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            {menuItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={toggleTheme}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
                            title={theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                        >
                            {theme === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                        </button>

                        <div className="flex items-center gap-3 pl-6 border-l border-gray-200 dark:border-gray-700 transition-colors">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{user?.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
                            </div>
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg">
                                {user?.name?.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
