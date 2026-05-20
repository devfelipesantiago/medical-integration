import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class ExameItemDto {
  @IsInt({ message: 'CodigoItemPedido deve ser um número inteiro' })
  CodigoItemPedido: number;

  @IsString()
  @IsNotEmpty({ message: 'AccessionNumber é obrigatório' })
  AccessionNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Modalidade é obrigatória' })
  Modalidade: string;

  @IsString()
  @IsNotEmpty({ message: 'NomeProcedimento é obrigatório' })
  NomeProcedimento: string;
}

export class CreatePedidoDto {
  @IsInt({ message: 'CodigoPedido deve ser um número inteiro' })
  CodigoPedido: number;

  @IsString()
  @IsNotEmpty({ message: 'NomePaciente é obrigatório' })
  NomePaciente: string;

  @IsString()
  @IsNotEmpty({ message: 'DataNascimento é obrigatória' })
  DataNascimento: string;

  @IsString()
  @IsNotEmpty({ message: 'Sexo é obrigatório' })
  Sexo: string;

  @IsInt({ message: 'CodUnidade deve ser um número inteiro' })
  CodUnidade: number;

  @IsArray({ message: 'Exames deve ser um array' })
  @ArrayMinSize(1, { message: 'O pedido deve ter ao menos um exame' })
  @ValidateNested({ each: true })
  @Type(() => ExameItemDto)
  Exames: ExameItemDto[];
}
