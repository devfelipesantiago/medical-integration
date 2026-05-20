import { Documento } from './entities/documento.entity';
import { CreateDocumentoDto } from './dto/create-documento.dto';

export const DOCUMENTOS_SERVICE = 'DOCUMENTOS_SERVICE';

export interface IDocumentosService {
  create(dto: CreateDocumentoDto): Promise<Documento>;
  findByPedido(codigoPedido: number): Promise<Documento[]>;
}
