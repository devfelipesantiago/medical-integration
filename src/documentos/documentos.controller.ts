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
import { IDocumentosService, DOCUMENTOS_SERVICE } from './documentos.service.interface';
import { CreateDocumentoDto } from './dto/create-documento.dto';

@Controller('documentos')
export class DocumentosController {
  constructor(
    @Inject(DOCUMENTOS_SERVICE)
    private readonly documentosService: IDocumentosService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDocumentoDto) {
    return this.documentosService.create(dto);
  }

  @Get(':codigoPedido')
  findByPedido(@Param('codigoPedido', ParseIntPipe) codigoPedido: number) {
    return this.documentosService.findByPedido(codigoPedido);
  }
}
