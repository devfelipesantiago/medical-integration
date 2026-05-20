import { Pedido } from './entities/pedido.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';

export const PEDIDOS_SERVICE = 'PEDIDOS_SERVICE';

export interface IPedidosService {
  create(dto: CreatePedidoDto): Promise<Pedido>;
  findOne(codigoPedido: number): Promise<Pedido>;
}
