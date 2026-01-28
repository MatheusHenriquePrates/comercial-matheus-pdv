import { useState, useEffect } from 'react'
import { Plus, Search, Filter, FileText, Smartphone, MapPin } from 'lucide-react'
import { customersAPI } from '../../services/api'
import { Modal } from '../../components/common'
import CustomerForm from './CustomerForm'
import CustomerDetails from './CustomerDetails'
import toast from 'react-hot-toast'

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Modals state
    const [showFormModal, setShowFormModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

    const fetchCustomers = async () => {
        setIsLoading(true)
        try {
            const data = await customersAPI.getAll()
            console.log('[CustomersPage] Fetched data:', data)
            setCustomers(data)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar clientes')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchCustomers()
    }, [])

    const handleCreate = () => {
        setSelectedCustomer(null)
        setShowFormModal(true)
    }

    const handleEdit = (customer: any) => {
        setSelectedCustomer(customer)
        setShowFormModal(true)
    }

    const handleViewDetails = (customer: any) => {
        setSelectedCustomer(customer)
        setShowDetailsModal(true)
    }

    const handleFormSuccess = () => {
        setShowFormModal(false)
        fetchCustomers()
        // If we were editing from details view, refresh selected customer too? 
        // We'll just close for simplicity or re-fetch details if needed.
        if (showDetailsModal && selectedCustomer) {
            // Re-fetch specific customer to update details view
            customersAPI.getById(selectedCustomer.id).then(data => setSelectedCustomer(data))
        }
    }

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.cpf?.includes(searchQuery) ||
        c.phone?.includes(searchQuery)
    )

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">Carteira de Clientes</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie seus clientes e visualize o histórico financeiro</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="h-12 px-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-green-200 transition-all hover:scale-105"
                >
                    <Plus className="w-5 h-5" /> Novo Cliente
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex gap-4 transition-colors">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, CPF ou telefone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-green-500 dark:focus:border-green-500 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                </div>
                {/* Placeholder for future filters */}
                <button className="h-12 w-12 flex items-center justify-center border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="py-20 text-center text-gray-400 animate-pulse">Carregando clientes...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCustomers.map(customer => (
                        <div
                            key={customer.id}
                            onClick={() => handleViewDetails(customer)}
                            className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 border-2 border-white dark:border-gray-600 shadow-sm">
                                    {customer.photoUrl ? (
                                        <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-xl">
                                            {customer.name.charAt(0)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{customer.name}</h3>

                                    <div className="space-y-1 mt-1">
                                        {customer.phone ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <Smartphone className="w-4 h-4" /> {customer.phone}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-400 dark:text-gray-500 italic">Sem telefone</div>
                                        )}

                                        {customer.address && (
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 truncate">
                                                <MapPin className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{customer.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                    {customer.debts?.length || 0} compras registradas
                                </span>
                                <button className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-bold flex items-center gap-1">
                                    Ver Relatório <FileText className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredCustomers.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Nenhum cliente encontrado</h3>
                            <p className="text-gray-500 dark:text-gray-400">Tente buscar por outro termo ou cadastre um novo cliente.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Form Modal */}
            <Modal
                isOpen={showFormModal}
                onClose={() => setShowFormModal(false)}
                title={selectedCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            >
                <CustomerForm
                    customer={selectedCustomer}
                    onClose={() => setShowFormModal(false)}
                    onSuccess={handleFormSuccess}
                />
            </Modal>

            {/* Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title="Relatório do Cliente"
                size="3xl"
            >
                <CustomerDetails
                    customer={selectedCustomer}
                    onClose={() => setShowDetailsModal(false)}
                    onEdit={() => {
                        setShowDetailsModal(false)
                        handleEdit(selectedCustomer)
                    }}
                    onUpdate={() => {
                        if (selectedCustomer) {
                            customersAPI.getById(selectedCustomer.id).then(data => setSelectedCustomer(data))
                            fetchCustomers() // Refresh list as well
                        }
                    }}
                />
            </Modal>
        </div>
    )
}
