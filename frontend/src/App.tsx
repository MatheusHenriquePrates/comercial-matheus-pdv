import { Routes, Route, Navigate } from 'react-router-dom'
import ImportNFE from './pages/management/ImportNFE'
import ProductsPage from './pages/management/ProductsPage'
import StockPage from './pages/management/StockPage'
import FiscalConfig from './pages/management/FiscalConfig'
import { useAuthStore } from './store/useAuthStore'
import ModuleSelector from './pages/ModuleSelector'
import Login from './pages/Login'
import PDV from './pages/PDV'
import ManagementLayout from './pages/management/ManagementLayout'
import DashboardPage from './pages/management/DashboardPage'
import CustomersPage from './pages/management/CustomersPage'
import { useEffect } from 'react'
import { syncService } from './services/sync.service'
import { ThemeInitializer } from './components/ThemeInitializer'

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, token } = useAuthStore()

    if (!isAuthenticated || !token) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

function App() {
    const { isAuthenticated } = useAuthStore()

    // Start sync service when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            syncService.startAutoSync()
        }
        return () => {
            syncService.stopAutoSync()
        }
    }, [isAuthenticated])

    return (
        <>
            <ThemeInitializer />
            <Routes>
                <Route path="/" element={<ModuleSelector />} />
                <Route path="/login" element={<Login />} />
                <Route
                    path="/pdv"
                    element={
                        <ProtectedRoute>
                            <PDV />
                        </ProtectedRoute>
                    }
                />

                {/* Management Routes */}
                <Route
                    path="/management"
                    element={
                        <ProtectedRoute>
                            <ManagementLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<DashboardPage />} />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="import-nfe" element={<ImportNFE />} />
                    <Route path="stock" element={<StockPage />} />
                    <Route path="fiscal-config" element={<FiscalConfig />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    )
}

export default App
