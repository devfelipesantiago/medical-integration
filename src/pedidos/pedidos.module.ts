import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { PEDIDOS_SERVICE } from './pedidos.service.interface';
import { Pedido } from './entities/pedido.entity';
import { ExameItemPedido } from './entities/exame-item-pedido.entity';
import { IntegracaoModule } from '../integracao/integracao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pedido, ExameItemPedido]),
    IntegracaoModule,
  ],
  controllers: [PedidosController],
  providers: [
    PedidosService,
    { provide: PEDIDOS_SERVICE, useClass: PedidosService },
  ],
  exports: [PEDIDOS_SERVICE],
})
export class PedidosModule {}
