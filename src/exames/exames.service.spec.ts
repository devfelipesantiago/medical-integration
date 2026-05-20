import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ExamesService } from './exames.service';
import { Exame } from './entities/exame.entity';
import { IntegracaoService } from '../integracao/integracao.service';

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

const makeRepo = (overrides: Partial<any> = {}) => ({
  findOne: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn(async (entity) => entity),
  ...overrides,
});

const mockIntegracaoService = {
  verificarIntegracaoPedido: jest.fn(),
  resolverExamesIntegradosDoPedido: jest.fn(),
  processarChegadaDeExame: jest.fn(async () => undefined),
};

const dtoExame = (accessionNumber = '930') => ({
  AccessionNumber: accessionNumber,
  NomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
  Modalidade: 'CR',
  Status: 'NOVO',
});

describe('ExamesService', () => {
  let service: ExamesService;
  let exameRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    exameRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamesService,
        { provide: getRepositoryToken(Exame), useValue: exameRepo },
        { provide: IntegracaoService, useValue: mockIntegracaoService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ExamesService>(ExamesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Cenário 4: Exame chega após pedido com documento pendente', () => {
    it('deve salvar o exame e delegar a integração ao IntegracaoService', async () => {
      const dto = dtoExame();

      exameRepo.findOne.mockResolvedValue(null);
      exameRepo.save.mockResolvedValue({ accessionNumber: '930', ...dto });

      await service.create(dto);

      expect(exameRepo.save).toHaveBeenCalledTimes(1);
      expect(mockIntegracaoService.processarChegadaDeExame).toHaveBeenCalledWith('930');
    });
  });

  describe('Exame já existente chega novamente', () => {
    it('deve atualizar o exame existente', async () => {
      const dto = dtoExame();
      const exameExistente = { accessionNumber: '930', status: 'PENDENTE' };

      exameRepo.findOne.mockResolvedValue(exameExistente);
      exameRepo.save.mockImplementation(async (e) => e);

      await service.create(dto);

      expect(exameRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'NOVO' }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar o exame quando encontrado', async () => {
      const exame = { accessionNumber: '930', status: 'NOVO' };
      exameRepo.findOne.mockResolvedValue(exame);

      const result = await service.findOne('930');
      expect(result).toBe(exame);
    });

    it('deve lançar NotFoundException quando exame não existe', async () => {
      exameRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('INEXISTENTE')).rejects.toThrow(NotFoundException);
    });
  });
});
