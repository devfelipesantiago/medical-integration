import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class CreateDocumentoDto {
  @IsInt({ message: 'CodigoDocumento deve ser um número inteiro' })
  CodigoDocumento: number;

  @IsInt({ message: 'CodigoPedido deve ser um número inteiro' })
  CodigoPedido: number;

  @IsString()
  @IsNotEmpty({ message: 'NomeDocumento é obrigatório' })
  NomeDocumento: string;

  @IsString()
  @IsNotEmpty({ message: 'Documento (base64) é obrigatório' })
  Documento: string;
}
