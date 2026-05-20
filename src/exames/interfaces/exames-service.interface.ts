import { Exame } from '../entities/exame.entity';
import { CreateExameDto } from '../dto/create-exame.dto';

export const EXAMES_SERVICE = 'EXAMES_SERVICE';

export interface IExamesService {
  create(dto: CreateExameDto): Promise<Exame>;
  findOne(accessionNumber: string): Promise<Exame>;
}
