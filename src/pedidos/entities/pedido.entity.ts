import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExameItemPedido } from './exame-item-pedido.entity';
import { Documento } from '../../documentos/entities/documento.entity';

@Entity('pedidos')
export class Pedido {
  @PrimaryColumn({ type: 'integer' })
  codigoPedido: number;

  @Column()
  nomePaciente: string;

  @Column()
  dataNascimento: string;

  @Column()
  sexo: string;

  @Column({ type: 'integer' })
  codUnidade: number;

  @Column({ default: false })
  integrado: boolean;

  @OneToMany(() => ExameItemPedido, (exame) => exame.pedido, {
    cascade: true,
    eager: true,
  })
  exames: ExameItemPedido[];

  @OneToMany(() => Documento, (doc) => doc.pedido, { eager: false })
  documentos: Documento[];

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
