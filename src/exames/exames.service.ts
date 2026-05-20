import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Exame } from './entities/exame.entity';
import { IntegracaoService } from '../integracao/integracao.service';
import { CreateExameDto } from './dto/create-exame.dto';
import { IExamesService } from './exames.service.interface';

@Injectable()
export class ExamesService implements IExamesService {
  constructor(
    @InjectRepository(Exame)
    private readonly exameRepo: Repository<Exame>,

    private readonly integracaoService: IntegracaoService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async create(dto: CreateExameDto): Promise<Exame> {
    this.logger.info('Chegada de exame', {
      context: 'ExamesService',
      accessionNumber: dto.AccessionNumber,
    });

    const exame = await this.salvarExame(dto);

    // Delega toda a lógica de integração ao IntegracaoService
    await this.integracaoService.processarChegadaDeExame(dto.AccessionNumber);

    return exame;
  }

  async findOne(accessionNumber: string): Promise<Exame> {
    const exame = await this.exameRepo.findOne({ where: { accessionNumber } });

    if (!exame) {
      throw new NotFoundException(
        `Exame com AccessionNumber ${accessionNumber} não encontrado`,
      );
    }

    return exame;
  }

  // ─── helpers privados ──────────────────────────────────────────────────────

  private async salvarExame(dto: CreateExameDto): Promise<Exame> {
    let exame = await this.exameRepo.findOne({
      where: { accessionNumber: dto.AccessionNumber },
    });

    if (exame) {
      exame.nomePaciente = dto.NomePaciente;
      exame.modalidade = dto.Modalidade;
      exame.status = dto.Status;
    } else {
      exame = this.exameRepo.create({
        accessionNumber: dto.AccessionNumber,
        nomePaciente: dto.NomePaciente,
        modalidade: dto.Modalidade,
        status: dto.Status,
      });
    }

    return this.exameRepo.save(exame);
  }
}
