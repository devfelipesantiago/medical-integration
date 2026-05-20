import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('exames')
export class Exame {
  @PrimaryColumn()
  accessionNumber: string;

  @Column()
  nomePaciente: string;

  @Column()
  modalidade: string;

  @Column()
  status: string;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
