import { useState, useEffect } from 'react'
import { Save, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { fiscalService, FiscalConfig as FiscalConfigType } from '../../services/fiscal.service'
import toast from 'react-hot-toast'

const FiscalConfig = () => {
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [config, setConfig] = useState<Partial<FiscalConfigType>>({
    certificateType: 'A3',
    ambiente: 'homologacao',
    serie: 1,
    ultimoNumero: 0,
    crt: '1'
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const data = await fiscalService.getConfig()
      if (data) {
        setConfig(data)
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
    }
  }

  const handleChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleTestCertificate = async () => {
    setTesting(true)

    try {
      const result = await fiscalService.testCertificate({
        certificateType: config.certificateType!,
        certificateA1: config.certificateA1,
        certificateA1Pass: config.certificateA1Pass,
        certificatePin: config.certificatePin,
        pkcs11Library: config.pkcs11Library
      })

      if (result.success) {
        toast.success('Certificado válido! ' + result.certificateInfo?.subject.organizationName)
      } else {
        toast.error(result.message)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await fiscalService.saveConfig(config as FiscalConfigType)
      toast.success('Configuração fiscal salva com sucesso!')
      loadConfig()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Configuração Fiscal - NFC-e
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados da Empresa */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Dados da Empresa
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">CNPJ *</label>
                <input
                  type="text"
                  value={config.cnpj || ''}
                  onChange={(e) => handleChange('cnpj', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Inscrição Estadual *</label>
                <input
                  type="text"
                  value={config.inscricaoEstadual || ''}
                  onChange={(e) => handleChange('inscricaoEstadual', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Razão Social *</label>
                <input
                  type="text"
                  value={config.razaoSocial || ''}
                  onChange={(e) => handleChange('razaoSocial', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nome Fantasia *</label>
                <input
                  type="text"
                  value={config.nomeFantasia || ''}
                  onChange={(e) => handleChange('nomeFantasia', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Endereço
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Logradouro *</label>
                <input
                  type="text"
                  value={config.logradouro || ''}
                  onChange={(e) => handleChange('logradouro', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número *</label>
                <input
                  type="text"
                  value={config.numero || ''}
                  onChange={(e) => handleChange('numero', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bairro *</label>
                <input
                  type="text"
                  value={config.bairro || ''}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CEP *</label>
                <input
                  type="text"
                  value={config.cep || ''}
                  onChange={(e) => handleChange('cep', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="00000-000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Município *</label>
                <input
                  type="text"
                  value={config.nomeMunicipio || ''}
                  onChange={(e) => handleChange('nomeMunicipio', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Código Município *</label>
                <input
                  type="text"
                  value={config.codigoMunicipio || ''}
                  onChange={(e) => handleChange('codigoMunicipio', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="3550308 (SP)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">UF *</label>
                <select
                  value={config.uf || ''}
                  onChange={(e) => handleChange('uf', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="SP">São Paulo</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="MG">Minas Gerais</option>
                  {/* Adicionar outros estados */}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <input
                  type="text"
                  value={config.telefone || ''}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="(11) 1234-5678"
                />
              </div>
            </div>
          </div>

          {/* Configurações Fiscais */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Configurações NFC-e
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Série</label>
                <input
                  type="number"
                  value={config.serie || 1}
                  onChange={(e) => handleChange('serie', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Último Número</label>
                <input
                  type="number"
                  value={config.ultimoNumero || 0}
                  onChange={(e) => handleChange('ultimoNumero', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ambiente</label>
                <select
                  value={config.ambiente || 'homologacao'}
                  onChange={(e) => handleChange('ambiente', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="homologacao">Homologação (Testes)</option>
                  <option value="producao">Produção</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">ID CSC</label>
                <input
                  type="text"
                  value={config.cscId || ''}
                  onChange={(e) => handleChange('cscId', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="000001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Token CSC</label>
                <input
                  type="password"
                  value={config.cscToken || ''}
                  onChange={(e) => handleChange('cscToken', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Token fornecido pela SEFAZ"
                />
              </div>
            </div>
          </div>

          {/* Certificado Digital */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Certificado Digital
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Tipo de Certificado</label>
              <select
                value={config.certificateType || 'A3'}
                onChange={(e) => handleChange('certificateType', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="A3">A3 (Cartão/Token)</option>
                <option value="A1">A1 (Arquivo .pfx)</option>
              </select>
            </div>

            {config.certificateType === 'A3' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">PIN do Certificado</label>
                  <input
                    type="password"
                    value={config.certificatePin || ''}
                    onChange={(e) => handleChange('certificatePin', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="PIN do cartão/token"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Biblioteca PKCS#11 (opcional)</label>
                  <input
                    type="text"
                    value={config.pkcs11Library || ''}
                    onChange={(e) => handleChange('pkcs11Library', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="/usr/lib/libaetpkss.so"
                  />
                </div>
              </div>
            )}

            {config.certificateType === 'A1' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Arquivo .pfx (Base64)</label>
                  <textarea
                    value={config.certificateA1 || ''}
                    onChange={(e) => handleChange('certificateA1', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                    rows={3}
                    placeholder="Cole aqui o conteúdo do certificado em Base64"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Senha do Certificado</label>
                  <input
                    type="password"
                    value={config.certificateA1Pass || ''}
                    onChange={(e) => handleChange('certificateA1Pass', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Senha do arquivo .pfx"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleTestCertificate}
              disabled={testing}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {testing ? 'Testando...' : 'Testar Certificado'}
            </button>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </form>
      </div>

      {/* Alertas */}
      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-semibold mb-2">Importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Configure primeiro em ambiente de homologação e teste</li>
              <li>O PIN e tokens são criptografados antes de salvar no banco</li>
              <li>Para certificado A3, o leitor de cartão deve estar conectado</li>
              <li>Obtenha o CSC no portal da SEFAZ do seu estado</li>
              <li>O código do município deve ser o código IBGE de 7 dígitos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FiscalConfig
