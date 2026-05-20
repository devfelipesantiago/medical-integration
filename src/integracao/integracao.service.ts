import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { ExameItemPedido } from '../pedidos/entities/exame-item-pedido.entity';
import { Documento } from '../documentos/entities/documento.entity';
import { Exame } from '../exames/entities/exame.entity';

@Injectable()
export class IntegracaoService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidoRepo: Repository<Pedido>,

    @InjectRepository(ExameItemPedido)
    private readonly exameItemRepo: Repository<ExameItemPedido>,

    @InjectRepository(Documento)
    private readonly documentoRepo: Repository<Documento>,

    @InjectRepository(Exame)
    private readonly exameRepo: Repository<Exame>,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async verificarIntegracaoPedido(pedido: Pedido): Promise<Pedido> {
    if (pedido.integrado) return pedido;

    const accessionNumbers = pedido.exames.map((e) => e.accessionNumber);
    if (accessionNumbers.length === 0) return pedido;

    const examesCorrespondentes = await this.exameRepo.findBy({
      accessionNumber: In(accessionNumbers),
    });

    if (examesCorrespondentes.length > 0) {
      pedido.integrado = true;
      await this.pedidoRepo.save(pedido);

      this.logger.info('Pedido marcado como integrado', {
        context: 'IntegracaoService',
        codigoPedido: pedido.codigoPedido,
        accessionNumbers: examesCorrespondentes.map((e) => e.accessionNumber),
      });
    }

    return pedido;
  }

  async resolverExamesIntegradosDoPedido(pedido: Pedido): Promise<string[]> {
    const accessionNumbers = pedido.exames.map((e) => e.accessionNumber);
    if (accessionNumbers.length === 0) return [];

    const examesEncontrados = await this.exameRepo.findBy({
      accessionNumber: In(accessionNumbers),
    });

    return examesEncontrados.map((e) => e.accessionNumber);
  }

  async processarChegadaDeExame(accessionNumber: string): Promise<void> {
    const exameItems = await this.exameItemRepo.find({
      where: { accessionNumber },
      relations: ['pedido', 'pedido.exames'],
    });

    if (exameItems.length === 0) {
      this.logger.info('Nenhum pedido encontrado para o AccessionNumber', {
        context: 'IntegracaoService',
        accessionNumber,
      });
      return;
    }

    for (const item of exameItems) {
      await this.integrarPedido(item.pedido, accessionNumber);
    }
  }

  private async integrarPedido(
    pedido: Pedido,
    accessionNumber: string,
  ): Promise<void> {
    if (!pedido.integrado) {
      pedido.integrado = true;
      await this.pedidoRepo.save(pedido);

      this.logger.info('Pedido integrado após chegada de exame', {
        context: 'IntegracaoService',
        codigoPedido: pedido.codigoPedido,
        accessionNumber,
      });
    }

    await this.vincularDocumentosPendentes(pedido.codigoPedido, accessionNumber);
  }

  private async vincularDocumentosPendentes(
    codigoPedido: number,
    accessionNumber: string,
  ): Promise<void> {
    const documentosPendentes = await this.documentoRepo.find({
      where: { codigoPedido, integrado: false },
    });

    if (documentosPendentes.length === 0) return;

    for (const doc of documentosPendentes) {
      const jaVinculado = (doc.examesVinculados ?? []).includes(accessionNumber);
      if (!jaVinculado) {
        doc.examesVinculados = [...(doc.examesVinculados ?? []), accessionNumber];
      }
      doc.integrado = true;
    }

    await this.documentoRepo.save(documentosPendentes);

    this.logger.info('Documentos pendentes vinculados', {
      context: 'IntegracaoService',
      codigoPedido,
      accessionNumber,
      quantidade: documentosPendentes.length,
    });
  }
}
