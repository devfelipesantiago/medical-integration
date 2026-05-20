import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { PedidosModule } from './pedidos/pedidos.module';
import { DocumentosModule } from './documentos/documentos.module';
import { ExamesModule } from './exames/exames.module';
import { IntegracaoModule } from './integracao/integracao.module';
import { Pedido } from './pedidos/entities/pedido.entity';
import { ExameItemPedido } from './pedidos/entities/exame-item-pedido.entity';
import { Documento } from './documentos/entities/documento.entity';
import { Exame } from './exames/entities/exame.entity';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.ms(),
            winston.format.printf(({ level, message, context, timestamp, ms }) => {
              return JSON.stringify({ timestamp, level, context, message, ms });
            }),
          ),
        }),
      ],
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? 'data/db.sqlite',
      entities: [Pedido, ExameItemPedido, Documento, Exame],
      synchronize: true,
      logging: process.env.NODE_ENV !== 'production',
    }),
    IntegracaoModule,
    PedidosModule,
    DocumentosModule,
    ExamesModule,
  ],
})
export class AppModule {}
