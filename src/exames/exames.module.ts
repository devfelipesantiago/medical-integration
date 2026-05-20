import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamesController } from './exames.controller';
import { ExamesService } from './exames.service';
import { EXAMES_SERVICE } from './exames.service.interface';
import { Exame } from './entities/exame.entity';
import { IntegracaoModule } from '../integracao/integracao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exame]),
    IntegracaoModule,
  ],
  controllers: [ExamesController],
  providers: [
    ExamesService,
    { provide: EXAMES_SERVICE, useClass: ExamesService },
  ],
  exports: [EXAMES_SERVICE],
})
export class ExamesModule {}
