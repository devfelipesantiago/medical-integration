import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Documento } from './entities/documento.entity';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { IntegracaoService } from '../integracao/integracao.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { IDocumentosService } from './documentos.service.interface';

@Injectable()
export class DocumentosService implements IDocumentosService {
  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepo: Repository<Documento>,

    @InjectRepository(Pedido)
    private readonly pedidoRepo: Repository<Pedido>,

    private readonly integracaoService: IntegracaoService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async create(dto: CreateDocumentoDto): Promise<Documento> {
    this.logger.info('Recebendo documento', {
      context: 'DocumentosService',
      codigoDocumento: dto.CodigoDocumento,
      codigoPedido: dto.CodigoPedido,
    });

    await this.verificarDuplicidade(dto.CodigoDocumento, dto.CodigoPedido);

    const pedido = await this.pedidoRepo.findOne({
      where: { codigoPedido: dto.CodigoPedido },
      relations: ['exames'],
    });

    if (!pedido) {
      throw new NotFoundException(
        `Pedido com código ${dto.CodigoPedido} não encontrado`,
      );
    }

    const documento = this.documentoRepo.create({
      codigoDocumento: dto.CodigoDocumento,
      codigoPedido: dto.CodigoPedido,
      nomeDocumento: dto.NomeDocumento,
      documento: dto.Documento,
      integrado: false,
      examesVinculados: [],
    });

    // Delega ao IntegracaoService a busca dos exames já integrados
    if (pedido.integrado) {
      const examesVinculados =
        await this.integracaoService.resolverExamesIntegradosDoPedido(pedido);

      if (examesVinculados.length > 0) {
        documento.examesVinculados = examesVinculados;
        documento.integrado = true;

        this.logger.info('Documento vinculado imediatamente ao pedido integrado', {
          context: 'DocumentosService',
          codigoDocumento: dto.CodigoDocumento,
          codigoPedido: dto.CodigoPedido,
          examesVinculados,
        });
      }
    } else {
      this.logger.info('Pedido ainda não integrado, documento aguardando vinculação', {
        context: 'DocumentosService',
        codigoDocumento: dto.CodigoDocumento,
        codigoPedido: dto.CodigoPedido,
      });
    }

    return this.documentoRepo.save(documento);
  }

  async findByPedido(codigoPedido: number): Promise<Documento[]> {
    const pedido = await this.pedidoRepo.findOne({ where: { codigoPedido } });

    if (!pedido) {
      throw new NotFoundException(
        `Pedido com código ${codigoPedido} não encontrado`,
      );
    }

    return this.documentoRepo.find({
      where: { codigoPedido },
      order: { criadoEm: 'ASC' },
    });
  }

  // ─── helpers privados ──────────────────────────────────────────────────────

  private async verificarDuplicidade(
    codigoDocumento: number,
    codigoPedido: number,
  ): Promise<void> {
    const existente = await this.documentoRepo.findOne({
      where: { codigoDocumento, codigoPedido },
    });

    if (existente) {
      this.logger.warn('Tentativa de inserção de documento duplicado', {
        context: 'DocumentosService',
        codigoDocumento,
        codigoPedido,
      });
      throw new ConflictException(
        `Documento ${codigoDocumento} já existe para o pedido ${codigoPedido}`,
      );
    }
  }
}
