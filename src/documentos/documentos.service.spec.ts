import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { DocumentosService } from './documentos.service';
import { Documento } from './entities/documento.entity';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { IntegracaoService } from '../integracao/integracao.service';

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

const makeRepo = (overrides: Partial<any> = {}) => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn(async (entity) => entity),
  ...overrides,
});

const mockIntegracaoService = {
  verificarIntegracaoPedido: jest.fn(),
  resolverExamesIntegradosDoPedido: jest.fn(async () => []),
  processarChegadaDeExame: jest.fn(),
};

const dtoDocumento = () => ({
  CodigoDocumento: 251,
  CodigoPedido: 615,
  NomeDocumento: 'PEDIDO',
  Documento: 'base64encodedcontent',
});

describe('DocumentosService', () => {
  let service: DocumentosService;
  let documentoRepo: ReturnType<typeof makeRepo>;
  let pedidoRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    documentoRepo = makeRepo();
    pedidoRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentosService,
        { provide: getRepositoryToken(Documento), useValue: documentoRepo },
        { provide: getRepositoryToken(Pedido), useValue: pedidoRepo },
        { provide: IntegracaoService, useValue: mockIntegracaoService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<DocumentosService>(DocumentosService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Cenário 3 ──────────────────────────────────────────────────────────
  describe('Cenário 3: Documento chega para pedido não integrado', () => {
    it('deve salvar documento com integrado=false sem chamar IntegracaoService', async () => {
      documentoRepo.findOne.mockResolvedValue(null);
      pedidoRepo.findOne.mockResolvedValue({
        codigoPedido: 615,
        integrado: false,
        exames: [{ accessionNumber: '930' }],
      });

      const result = await service.create(dtoDocumento());

      expect(result.integrado).toBe(false);
      expect(result.examesVinculados).toEqual([]);
      expect(mockIntegracaoService.resolverExamesIntegradosDoPedido).not.toHaveBeenCalled();
    });
  });

  // ─── Cenário 6 ──────────────────────────────────────────────────────────
  describe('Cenário 6: Documento duplicado', () => {
    it('deve lançar ConflictException', async () => {
      documentoRepo.findOne.mockResolvedValue({ id: 1, codigoDocumento: 251, codigoPedido: 615 });

      await expect(service.create(dtoDocumento())).rejects.toThrow(ConflictException);
    });
  });

  describe('Documento chega para pedido já integrado', () => {
    it('deve delegar a busca de exames ao IntegracaoService e vincular imediatamente', async () => {
      documentoRepo.findOne.mockResolvedValue(null);
      pedidoRepo.findOne.mockResolvedValue({
        codigoPedido: 615,
        integrado: true,
        exames: [{ accessionNumber: '930' }],
      });
      mockIntegracaoService.resolverExamesIntegradosDoPedido.mockResolvedValue(['930']);

      const result = await service.create(dtoDocumento());

      expect(mockIntegracaoService.resolverExamesIntegradosDoPedido).toHaveBeenCalledTimes(1);
      expect(result.integrado).toBe(true);
      expect(result.examesVinculados).toContain('930');
    });
  });

  describe('findByPedido', () => {
    it('deve retornar lista de documentos do pedido', async () => {
      pedidoRepo.findOne.mockResolvedValue({ codigoPedido: 615 });
      documentoRepo.find.mockResolvedValue([{ id: 1, codigoPedido: 615 }]);

      const result = await service.findByPedido(615);
      expect(result).toHaveLength(1);
    });

    it('deve lançar NotFoundException se pedido não existe', async () => {
      pedidoRepo.findOne.mockResolvedValue(null);
      await expect(service.findByPedido(999)).rejects.toThrow(NotFoundException);
    });
  });
});
