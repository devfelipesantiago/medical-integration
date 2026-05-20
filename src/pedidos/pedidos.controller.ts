import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Inject,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IPedidosService, PEDIDOS_SERVICE } from './pedidos.service.interface';
import { CreatePedidoDto } from './dto/create-pedido.dto';

@Controller('pedidos')
export class PedidosController {
  constructor(
    @Inject(PEDIDOS_SERVICE)
    private readonly pedidosService: IPedidosService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePedidoDto) {
    return this.pedidosService.create(dto);
  }

  @Get(':codigoPedido')
  findOne(@Param('codigoPedido', ParseIntPipe) codigoPedido: number) {
    return this.pedidosService.findOne(codigoPedido);
  }
}
