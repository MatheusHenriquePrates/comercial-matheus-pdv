import { useState, useEffect } from 'react'
import { Camera, Save, RefreshCw } from 'lucide-react'
import { customersAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { isValidCPF } from '../../utils/validators'

interface CustomerFormProps {
    customer?: any
    onClose: () => void
    onSuccess: () => void
}

export default function CustomerForm({ customer, onClose, onSuccess }: CustomerFormProps) {
    const isEditing = !!customer
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        cpf: '',
        address: '',
        birthDate: '',
        photoUrl: ''
    })

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                cpf: customer.cpf || '',
                address: customer.address || '',
                birthDate: customer.birthDate ? new Date(customer.birthDate).toISOString().split('T')[0] : '',
                photoUrl: customer.photoUrl || ''
            })
        }
    }, [customer])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name) return toast.error('Nome é obrigatório')
        if (formData.cpf && !isValidCPF(formData.cpf)) return toast.error('CPF inválido')

        setIsLoading(true)
        try {
            if (isEditing) {
                await customersAPI.update(customer.id, formData)
                toast.success('Cliente atualizado com sucesso!')
            } else {
                await customersAPI.create(formData)
                toast.success('Cliente cadastrado com sucesso!')
            }
            onSuccess()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar cliente')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4 mb-6">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 relative overflow-hidden group transition-colors">
                    {formData.photoUrl ? (
                        <img src={formData.photoUrl} alt="Foto do cliente" className="w-full h-full object-cover" />
                    ) : (
                        <Camera className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-bold px-2 text-center">Inserir URL</span>
                    </div>
                </div>
                {/* Simple URL input for now as per plan */}
                <input
                    type="text"
                    placeholder="URL da foto (opcional)"
                    value={formData.photoUrl}
                    onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                    className="text-sm text-center bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-green-500 dark:focus:border-green-500 outline-none w-full max-w-xs text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nome Completo *</label>
                    <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:border-green-500 dark:focus:border-green-500 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        placeholder="Ex: João da Silva"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">CPF</label>
                    <input
                        type="text"
                        value={formData.cpf}
                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:border-green-500 dark:focus:border-green-500 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        placeholder="000.000.000-00"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Telefone / WhatsApp</label>
                    <input
                        type="text"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:border-green-500 dark:focus:border-green-500 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        placeholder="(00) 00000-0000"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Data de Nascimento</label>
                    <input
                        type="date"
                        value={formData.birthDate}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:border-green-500 dark:focus:border-green-500 outline-none transition-colors"
                    />
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Endereço Completo</label>
                    <input
                        type="text"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:border-green-500 dark:focus:border-green-500 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-600"
                        placeholder="Rua, Número, Bairro, Cidade - UF"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 transition-colors">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 h-12 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
            </div>
        </form>
    )
}
