import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { DOCUMENTOS_SERVICE } from './documentos.service.interface';
import { Documento } from './entities/documento.entity';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { IntegracaoModule } from '../integracao/integracao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Documento, Pedido]),
    IntegracaoModule,
  ],
  controllers: [DocumentosController],
  providers: [
    DocumentosService,
    { provide: DOCUMENTOS_SERVICE, useClass: DocumentosService },
  ],
  exports: [DOCUMENTOS_SERVICE],
})
export class DocumentosModule {}
