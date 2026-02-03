-- CreateEnum
CREATE TYPE "NFCeStatus" AS ENUM ('PROCESSANDO', 'AUTORIZADA', 'REJEITADA', 'CANCELADA', 'DENEGADA', 'CONTINGENCIA');

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "stock" SET DEFAULT 0,
ALTER COLUMN "stock" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "minStock" SET DEFAULT 10,
ALTER COLUMN "minStock" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "StockMovement" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "FiscalConfig" (
    "id" SERIAL NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT NOT NULL,
    "inscricaoEstadual" TEXT NOT NULL,
    "inscricaoMunicipal" TEXT,
    "crt" TEXT NOT NULL DEFAULT '1',
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "codigoMunicipio" TEXT NOT NULL,
    "nomeMunicipio" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "telefone" TEXT,
    "serie" INTEGER NOT NULL DEFAULT 1,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
    "ambiente" TEXT NOT NULL DEFAULT 'homologacao',
    "cscId" TEXT,
    "cscToken" TEXT,
    "certificateType" TEXT NOT NULL DEFAULT 'A3',
    "certificatePin" TEXT,
    "pkcs11Library" TEXT,
    "certificateA1" TEXT,
    "certificateA1Pass" TEXT,
    "contingencyMode" BOOLEAN NOT NULL DEFAULT false,
    "contingencyReason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedNFCe" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "serie" INTEGER NOT NULL,
    "modelo" TEXT NOT NULL DEFAULT '65',
    "chaveAcesso" TEXT NOT NULL,
    "saleId" INTEGER NOT NULL,
    "status" "NFCeStatus" NOT NULL DEFAULT 'PROCESSANDO',
    "tipoEmissao" TEXT NOT NULL DEFAULT '1',
    "protocolo" TEXT,
    "dataAutorizacao" TIMESTAMP(3),
    "mensagemSefaz" TEXT,
    "codigoStatus" TEXT,
    "xmlEnvio" TEXT NOT NULL,
    "xmlRetorno" TEXT,
    "xmlCompleto" TEXT,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "valorProdutos" DOUBLE PRECISION NOT NULL,
    "valorDesconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "destinatarioCpf" TEXT,
    "destinatarioNome" TEXT,
    "cancelada" BOOLEAN NOT NULL DEFAULT false,
    "dataCancelamento" TIMESTAMP(3),
    "protocoloCancelamento" TEXT,
    "motivoCancelamento" TEXT,
    "contingencia" BOOLEAN NOT NULL DEFAULT false,
    "dataContingencia" TIMESTAMP(3),
    "fiscalConfigId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuedNFCe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NFCeItem" (
    "id" SERIAL NOT NULL,
    "nfceId" INTEGER NOT NULL,
    "numeroItem" INTEGER NOT NULL,
    "codigoProduto" TEXT NOT NULL,
    "ean" TEXT,
    "descricao" TEXT NOT NULL,
    "ncm" TEXT NOT NULL,
    "cfop" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "icmsOrigem" TEXT NOT NULL DEFAULT '0',
    "icmsCsosn" TEXT NOT NULL DEFAULT '102',
    "pisCST" TEXT NOT NULL DEFAULT '07',
    "cofinsCST" TEXT NOT NULL DEFAULT '07',

    CONSTRAINT "NFCeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NFCeContingency" (
    "id" SERIAL NOT NULL,
    "nfceId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "dataHoraEntrada" TIMESTAMP(3) NOT NULL,
    "dataHoraSaida" TIMESTAMP(3),
    "transmitida" BOOLEAN NOT NULL DEFAULT false,
    "dataTransmissao" TIMESTAMP(3),
    "protocoloTransmissao" TEXT,

    CONSTRAINT "NFCeContingency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalConfig_cnpj_key" ON "FiscalConfig"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedNFCe_chaveAcesso_key" ON "IssuedNFCe"("chaveAcesso");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedNFCe_saleId_key" ON "IssuedNFCe"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "NFCeContingency_nfceId_key" ON "NFCeContingency"("nfceId");

-- AddForeignKey
ALTER TABLE "IssuedNFCe" ADD CONSTRAINT "IssuedNFCe_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedNFCe" ADD CONSTRAINT "IssuedNFCe_fiscalConfigId_fkey" FOREIGN KEY ("fiscalConfigId") REFERENCES "FiscalConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFCeItem" ADD CONSTRAINT "NFCeItem_nfceId_fkey" FOREIGN KEY ("nfceId") REFERENCES "IssuedNFCe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFCeContingency" ADD CONSTRAINT "NFCeContingency_nfceId_fkey" FOREIGN KEY ("nfceId") REFERENCES "IssuedNFCe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
