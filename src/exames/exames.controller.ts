import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IExamesService, EXAMES_SERVICE } from './exames.service.interface';
import { CreateExameDto } from './dto/create-exame.dto';

@Controller('exames')
export class ExamesController {
  constructor(
    @Inject(EXAMES_SERVICE)
    private readonly examesService: IExamesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateExameDto) {
    return this.examesService.create(dto);
  }

  @Get(':accessionNumber')
  findOne(@Param('accessionNumber') accessionNumber: string) {
    return this.examesService.findOne(accessionNumber);
  }
}
