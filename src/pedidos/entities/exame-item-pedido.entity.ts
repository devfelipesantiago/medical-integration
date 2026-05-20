import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pedido } from './pedido.entity';

@Entity('exame_item_pedido')
@Index(['codigoItemPedido', 'pedidoCodigoPedido'], { unique: true })
export class ExameItemPedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  codigoItemPedido: number;

  @Column()
  accessionNumber: string;

  @Column()
  modalidade: string;

  @Column()
  nomeProcedimento: string;

  // FK column exposed para uso no índice composto
  @Column({ type: 'integer', nullable: true })
  pedidoCodigoPedido: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.exames, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedidoCodigoPedido' })
  pedido: Pedido;
}
