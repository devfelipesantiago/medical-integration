import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracaoService } from './integracao.service';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { ExameItemPedido } from '../pedidos/entities/exame-item-pedido.entity';
import { Documento } from '../documentos/entities/documento.entity';
import { Exame } from '../exames/entities/exame.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, ExameItemPedido, Documento, Exame])],
  providers: [IntegracaoService],
  exports: [IntegracaoService],
})
export class IntegracaoModule {}
