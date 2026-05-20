import { IsString, IsNotEmpty } from 'class-validator';

export class CreateExameDto {
  @IsString()
  @IsNotEmpty({ message: 'AccessionNumber é obrigatório' })
  AccessionNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'NomePaciente é obrigatório' })
  NomePaciente: string;

  @IsString()
  @IsNotEmpty({ message: 'Modalidade é obrigatória' })
  Modalidade: string;

  @IsString()
  @IsNotEmpty({ message: 'Status é obrigatório' })
  Status: string;
}
