import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, ArrowLeft, Loader2, ShoppingCart, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store/useAuthStore'

const loginSchema = z.object({
    username: z.string().min(1, 'Usuário é obrigatório'),
    password: z.string().min(1, 'Senha é obrigatória'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function Login() {
    const navigate = useNavigate()
    const location = useLocation()
    const { login: storeLogin } = useAuthStore()
    const [isLoading, setIsLoading] = useState(false)

    // Get module from state or default to sales
    const targetModule = location.state?.module || 'sales'
    const isManagement = targetModule === 'management'

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true)

        try {
            const response = await authAPI.login(data.username, data.password)
            storeLogin(response.user, response.token)
            toast.success(`Bem-vindo, ${response.user.name}!`)

            // Redirect based on selected module
            if (isManagement) {
                navigate('/management')
            } else {
                navigate('/pdv')
            }
        } catch (error) {
            console.error('Login error:', error)
            toast.error('Usuário ou senha inválidos')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col relative overflow-hidden transition-colors duration-300">
            {/* Subtle decorative circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-green-400/20 dark:bg-green-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl" />
            </div>

            {/* Back button */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-medium px-4 py-2 rounded-xl transition-all z-20 backdrop-blur-sm border border-white/20"
            >
                <ArrowLeft className="w-5 h-5" />
                Voltar
            </button>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-md">
                    {/* Login card */}
                    <div className="bg-white/15 dark:bg-black/30 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-2xl transition-colors">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${isManagement ? 'bg-teal-500' : 'bg-yellow-400'
                                }`}>
                                {isManagement ? (
                                    <BarChart3 className="w-8 h-8 text-white" />
                                ) : (
                                    <ShoppingCart className="w-8 h-8 text-green-800" />
                                )}
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-1">
                                {isManagement ? 'Sistema de Gestão' : 'Sistema de Vendas'}
                            </h1>
                            <p className="text-white/70">
                                Entre com suas credenciais
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-white/90 mb-2">
                                    Usuário
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 dark:text-green-500" />
                                    <input
                                        type="text"
                                        placeholder="Digite seu usuário"
                                        className="w-full h-12 pl-12 pr-4 rounded-xl bg-white dark:bg-gray-800 text-green-800 dark:text-gray-100 placeholder:text-green-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 dark:focus:ring-yellow-400/30 text-base transition-colors"
                                        {...register('username')}
                                    />
                                </div>
                                {errors.username && (
                                    <p className="mt-2 text-sm text-yellow-300">{errors.username.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/90 mb-2">
                                    Senha
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 dark:text-green-500" />
                                    <input
                                        type="password"
                                        placeholder="Digite sua senha"
                                        className="w-full h-12 pl-12 pr-4 rounded-xl bg-white dark:bg-gray-800 text-green-800 dark:text-gray-100 placeholder:text-green-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-yellow-400/50 dark:focus:ring-yellow-400/30 text-base transition-colors"
                                        {...register('password')}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="mt-2 text-sm text-yellow-300">{errors.password.message}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold text-base rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    'ENTRAR'
                                )}
                            </button>
                        </form>

                        <p className="text-center text-sm text-white/50 mt-6">
                            Esqueceu sua senha? Contate o administrador.
                        </p>
                    </div>

                    <p className="text-center text-sm text-white/50 mt-6">
                        Comercial Matheus © 2026
                    </p>
                </div>
            </div>
        </div>
    )
}
