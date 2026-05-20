import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PedidosService } from './pedidos.service';
import { Pedido } from './entities/pedido.entity';
import { ExameItemPedido } from './entities/exame-item-pedido.entity';
import { IntegracaoService } from '../integracao/integracao.service';

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

const makeRepo = (overrides: Partial<any> = {}) => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findBy: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn(async (entity) => entity),
  ...overrides,
});

const mockIntegracaoService = {
  verificarIntegracaoPedido: jest.fn(async (pedido) => pedido),
  resolverExamesIntegradosDoPedido: jest.fn(async () => []),
  processarChegadaDeExame: jest.fn(async () => undefined),
};

const dtoPedido = (codigoPedido = 616) => ({
  CodigoPedido: codigoPedido,
  NomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
  DataNascimento: '19970601',
  Sexo: 'M',
  CodUnidade: 104,
  Exames: [
    {
      CodigoItemPedido: 930,
      AccessionNumber: '930',
      Modalidade: 'CR',
      NomeProcedimento: 'RX ANTEBRACO ESQUERDO',
    },
  ],
});

describe('PedidosService', () => {
  let service: PedidosService;
  let pedidoRepo: ReturnType<typeof makeRepo>;
  let exameItemRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    pedidoRepo = makeRepo();
    exameItemRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidosService,
        { provide: getRepositoryToken(Pedido), useValue: pedidoRepo },
        { provide: getRepositoryToken(ExameItemPedido), useValue: exameItemRepo },
        { provide: IntegracaoService, useValue: mockIntegracaoService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PedidosService>(PedidosService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Cenário 1: Pedido chega e não existe exame correspondente', () => {
    it('deve salvar pedido e delegar verificação de integração', async () => {
      const dto = dtoPedido();

      pedidoRepo.findOne.mockResolvedValue(null);
      pedidoRepo.save.mockImplementation(async (e) => ({
        ...e,
        codigoPedido: 616,
        integrado: false,
      }));
      exameItemRepo.save.mockResolvedValue([{ accessionNumber: '930' }]);

      mockIntegracaoService.verificarIntegracaoPedido.mockResolvedValue({
        codigoPedido: 616,
        integrado: false,
        exames: [],
      });

      const result = await service.create(dto);

      expect(mockIntegracaoService.verificarIntegracaoPedido).toHaveBeenCalledTimes(1);
      expect(result.integrado).toBe(false);
    });
  });

  describe('Cenário 2: Pedido chega e já existe exame correspondente', () => {
    it('deve retornar pedido integrado quando IntegracaoService confirmar', async () => {
      const dto = dtoPedido();

      pedidoRepo.findOne.mockResolvedValue(null);
      pedidoRepo.save.mockImplementation(async (e) => ({ ...e, codigoPedido: 616 }));
      exameItemRepo.save.mockResolvedValue([{ accessionNumber: '930' }]);

      mockIntegracaoService.verificarIntegracaoPedido.mockResolvedValue({
        codigoPedido: 616,
        integrado: true,
        exames: [{ accessionNumber: '930' }],
      });

      const result = await service.create(dto);

      expect(result.integrado).toBe(true);
    });
  });

  describe('Cenário 5: Pedido chega novamente com novo exame', () => {
    it('deve adicionar apenas o exame novo, sem duplicar', async () => {
      const dto = {
        ...dtoPedido(),
        Exames: [
          { CodigoItemPedido: 930, AccessionNumber: '930', Modalidade: 'CR', NomeProcedimento: 'RX ANTEBRACO' },
          { CodigoItemPedido: 931, AccessionNumber: '931', Modalidade: 'CR', NomeProcedimento: 'RX TORAX' },
        ],
      };

      pedidoRepo.findOne.mockResolvedValue({
        codigoPedido: 616,
        integrado: false,
        exames: [{ codigoItemPedido: 930, accessionNumber: '930' }],
      });

      exameItemRepo.save.mockResolvedValue([{ codigoItemPedido: 931 }]);
      mockIntegracaoService.verificarIntegracaoPedido.mockImplementation(async (p) => p);
      pedidoRepo.save.mockImplementation(async (e) => e);

      await service.create(dto);

      const savedExames = exameItemRepo.save.mock.calls[0][0] as any[];
      expect(savedExames).toHaveLength(1);
      expect(savedExames[0].codigoItemPedido).toBe(931);
    });

    it('não deve chamar save de exameItem quando todos os exames já existem', async () => {
      const dto = dtoPedido();

      pedidoRepo.findOne.mockResolvedValue({
        codigoPedido: 616,
        integrado: false,
        exames: [{ codigoItemPedido: 930, accessionNumber: '930' }],
      });

      mockIntegracaoService.verificarIntegracaoPedido.mockImplementation(async (p) => p);
      pedidoRepo.save.mockImplementation(async (e) => e);

      await service.create(dto);

      expect(exameItemRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve retornar o pedido quando encontrado', async () => {
      const pedido = { codigoPedido: 616, integrado: false };
      pedidoRepo.findOne.mockResolvedValue(pedido);

      const result = await service.findOne(616);
      expect(result).toBe(pedido);
    });

    it('deve lançar NotFoundException quando pedido não existe', async () => {
      pedidoRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
