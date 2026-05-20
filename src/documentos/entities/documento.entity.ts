import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Pedido } from '../../pedidos/entities/pedido.entity';

@Entity('documentos')
@Index(['codigoDocumento', 'codigoPedido'], { unique: true })
export class Documento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  codigoDocumento: number;

  @Column({ type: 'integer' })
  codigoPedido: number;

  @Column()
  nomeDocumento: string;

  @Column({ type: 'text' })
  documento: string; // base64

  @Column({ default: false })
  integrado: boolean;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: string[]) => (value ? JSON.stringify(value) : '[]'),
      from: (value: string) => {
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
    },
  })
  examesVinculados: string[];

  @ManyToOne(() => Pedido, (pedido) => pedido.documentos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'codigoPedido', referencedColumnName: 'codigoPedido' })
  pedido: Pedido;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
