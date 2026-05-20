import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { IntegracaoService } from './integracao.service';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { ExameItemPedido } from '../pedidos/entities/exame-item-pedido.entity';
import { Documento } from '../documentos/entities/documento.entity';
import { Exame } from '../exames/entities/exame.entity';

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

const makeRepo = (overrides: Partial<any> = {}) => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findBy: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn(async (entity) => entity),
  ...overrides,
});

describe('IntegracaoService', () => {
  let service: IntegracaoService;
  let pedidoRepo: ReturnType<typeof makeRepo>;
  let exameItemRepo: ReturnType<typeof makeRepo>;
  let documentoRepo: ReturnType<typeof makeRepo>;
  let exameRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    pedidoRepo = makeRepo();
    exameItemRepo = makeRepo();
    documentoRepo = makeRepo();
    exameRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegracaoService,
        { provide: getRepositoryToken(Pedido), useValue: pedidoRepo },
        { provide: getRepositoryToken(ExameItemPedido), useValue: exameItemRepo },
        { provide: getRepositoryToken(Documento), useValue: documentoRepo },
        { provide: getRepositoryToken(Exame), useValue: exameRepo },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<IntegracaoService>(IntegracaoService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('verificarIntegracaoPedido', () => {
    it('deve marcar pedido como integrado quando exame correspondente existe', async () => {
      const pedido = {
        codigoPedido: 616,
        integrado: false,
        exames: [{ accessionNumber: '930' }],
      } as any;

      exameRepo.findBy.mockResolvedValue([{ accessionNumber: '930' }]);
      pedidoRepo.save.mockImplementation(async (e) => e);

      const result = await service.verificarIntegracaoPedido(pedido);

      expect(result.integrado).toBe(true);
      expect(pedidoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ integrado: true }));
    });

    it('deve manter pedido não integrado quando não há exame correspondente', async () => {
      const pedido = {
        codigoPedido: 616,
        integrado: false,
        exames: [{ accessionNumber: '930' }],
      } as any;

      exameRepo.findBy.mockResolvedValue([]);

      const result = await service.verificarIntegracaoPedido(pedido);

      expect(result.integrado).toBe(false);
      expect(pedidoRepo.save).not.toHaveBeenCalled();
    });

    it('deve retornar pedido sem consultar banco quando já está integrado', async () => {
      const pedido = { codigoPedido: 616, integrado: true, exames: [] } as any;

      const result = await service.verificarIntegracaoPedido(pedido);

      expect(exameRepo.findBy).not.toHaveBeenCalled();
      expect(result).toBe(pedido);
    });
  });

  describe('processarChegadaDeExame', () => {
    it('deve integrar pedido e vincular documentos pendentes', async () => {
      exameItemRepo.find.mockResolvedValue([
        {
          accessionNumber: '930',
          pedido: {
            codigoPedido: 616,
            integrado: false,
            exames: [{ accessionNumber: '930' }],
          },
        },
      ]);

      pedidoRepo.save.mockImplementation(async (e) => e);

      const docPendente = {
        id: 1,
        codigoPedido: 616,
        integrado: false,
        examesVinculados: [],
      };
      documentoRepo.find.mockResolvedValue([docPendente]);
      documentoRepo.save.mockImplementation(async (docs) => docs);

      await service.processarChegadaDeExame('930');

      expect(pedidoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ integrado: true }),
      );
      expect(documentoRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            integrado: true,
            examesVinculados: expect.arrayContaining(['930']),
          }),
        ]),
      );
    });

    it('não deve fazer nada se não houver pedido com esse AccessionNumber', async () => {
      exameItemRepo.find.mockResolvedValue([]);

      await service.processarChegadaDeExame('INEXISTENTE');

      expect(pedidoRepo.save).not.toHaveBeenCalled();
      expect(documentoRepo.save).not.toHaveBeenCalled();
    });

    it('não deve salvar pedido novamente se já estiver integrado', async () => {
      exameItemRepo.find.mockResolvedValue([
        {
          accessionNumber: '930',
          pedido: { codigoPedido: 616, integrado: true, exames: [] },
        },
      ]);

      documentoRepo.find.mockResolvedValue([]);

      await service.processarChegadaDeExame('930');

      expect(pedidoRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('resolverExamesIntegradosDoPedido', () => {
    it('deve retornar apenas os accessionNumbers presentes na tabela de exames', async () => {
      const pedido = {
        exames: [{ accessionNumber: '930' }, { accessionNumber: '931' }],
      } as any;

      exameRepo.findBy.mockResolvedValue([{ accessionNumber: '930' }]);

      const result = await service.resolverExamesIntegradosDoPedido(pedido);

      expect(result).toEqual(['930']);
    });

    it('deve retornar array vazio se pedido não tiver exames', async () => {
      const result = await service.resolverExamesIntegradosDoPedido({ exames: [] } as any);
      expect(result).toEqual([]);
      expect(exameRepo.findBy).not.toHaveBeenCalled();
    });
  });
});
