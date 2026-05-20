import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Pedido } from './entities/pedido.entity';
import { ExameItemPedido } from './entities/exame-item-pedido.entity';
import { IntegracaoService } from '../integracao/integracao.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { IPedidosService } from './pedidos.service.interface';

@Injectable()
export class PedidosService implements IPedidosService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidoRepo: Repository<Pedido>,

    @InjectRepository(ExameItemPedido)
    private readonly exameItemRepo: Repository<ExameItemPedido>,

    private readonly integracaoService: IntegracaoService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async create(dto: CreatePedidoDto): Promise<Pedido> {
    this.logger.info('Recebendo pedido', {
      context: 'PedidosService',
      codigoPedido: dto.CodigoPedido,
    });

    let pedido = await this.pedidoRepo.findOne({
      where: { codigoPedido: dto.CodigoPedido },
      relations: ['exames'],
    });

    if (pedido) {
      pedido = await this.mergeExames(pedido, dto);
    } else {
      pedido = await this.createNovoPedido(dto);
    }

    // Delega a verificação de integração ao IntegracaoService
    pedido = await this.integracaoService.verificarIntegracaoPedido(pedido);

    this.logger.info('Pedido processado', {
      context: 'PedidosService',
      codigoPedido: pedido.codigoPedido,
      integrado: pedido.integrado,
    });

    return pedido;
  }

  async findOne(codigoPedido: number): Promise<Pedido> {
    const pedido = await this.pedidoRepo.findOne({
      where: { codigoPedido },
      relations: ['exames', 'documentos'],
    });

    if (!pedido) {
      throw new NotFoundException(
        `Pedido com código ${codigoPedido} não encontrado`,
      );
    }

    return pedido;
  }

  // ─── helpers privados ──────────────────────────────────────────────────────

  private async createNovoPedido(dto: CreatePedidoDto): Promise<Pedido> {
    const pedido = this.pedidoRepo.create({
      codigoPedido: dto.CodigoPedido,
      nomePaciente: dto.NomePaciente,
      dataNascimento: dto.DataNascimento,
      sexo: dto.Sexo,
      codUnidade: dto.CodUnidade,
      integrado: false,
    });

    await this.pedidoRepo.save(pedido);

    const exameEntities = dto.Exames.map((e) =>
      this.exameItemRepo.create({
        codigoItemPedido: e.CodigoItemPedido,
        accessionNumber: e.AccessionNumber,
        modalidade: e.Modalidade,
        nomeProcedimento: e.NomeProcedimento,
        pedidoCodigoPedido: pedido.codigoPedido,
      }),
    );

    pedido.exames = await this.exameItemRepo.save(exameEntities);
    return pedido;
  }

  private async mergeExames(pedido: Pedido, dto: CreatePedidoDto): Promise<Pedido> {
    const codigosExistentes = new Set(
      pedido.exames.map((e) => e.codigoItemPedido),
    );

    const novosExames = dto.Exames.filter(
      (e) => !codigosExistentes.has(e.CodigoItemPedido),
    );

    if (novosExames.length === 0) {
      this.logger.info('Nenhum exame novo para adicionar', {
        context: 'PedidosService',
        codigoPedido: pedido.codigoPedido,
      });
      return pedido;
    }

    const exameEntities = novosExames.map((e) =>
      this.exameItemRepo.create({
        codigoItemPedido: e.CodigoItemPedido,
        accessionNumber: e.AccessionNumber,
        modalidade: e.Modalidade,
        nomeProcedimento: e.NomeProcedimento,
        pedidoCodigoPedido: pedido.codigoPedido,
      }),
    );

    const savedExames = await this.exameItemRepo.save(exameEntities);
    pedido.exames = [...pedido.exames, ...savedExames];

    this.logger.info('Exames adicionados ao pedido', {
      context: 'PedidosService',
      codigoPedido: pedido.codigoPedido,
      examesAdicionados: novosExames.length,
    });

    return pedido;
  }
}
