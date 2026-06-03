import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { ReservationItem } from '../entities/reservation-item.entity';
import { Product } from '../../products/entities/product.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { ReservationStatus } from '../enums/reservations.enums';

@Injectable()
export class ReservationsService {
  constructor(private readonly dataSource: DataSource) { }

  async createReservation(userId: number, dto: CreateReservationDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const reservationItems: ReservationItem[] = [];

      for (const item of dto.items) {
        const product = await queryRunner.manager.findOne(Product, { where: { id: item.productId } });
        if (!product) throw new BadRequestException(`El servicio/producto con ID ${item.productId} no existe.`);

        totalAmount += Number(product.price) * item.quantity;

        const resItem = queryRunner.manager.create(ReservationItem, {
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        });
        reservationItems.push(resItem);
      }

      const newReservation = queryRunner.manager.create(Reservation, {
        userId,
        eventDate: dto.eventDate,
        serviceStartTime: dto.serviceStartTime,
        guestsCount: dto.guestsCount,
        venueAddress: dto.venueAddress,
        city: dto.city,
        additionalNotes: dto.additionalNotes,
        totalAmount,
        status: ReservationStatus.PENDING_REVIEW, // Esperando aprobación del Admin
        items: reservationItems,
      });

      await queryRunner.manager.save(newReservation);
      await queryRunner.commitTransaction();
      return newReservation;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error al registrar la reserva: ' + (error as Error).message);
    } finally {
      await queryRunner.release();
    }
  }

  // 🟢 FILTRADO PARA EL CLIENTE: Solo ve las suyas
  async findAll(userId: number): Promise<Reservation[]> {
    return await this.dataSource.getRepository(Reservation).find({
      where: { userId },
      relations: ['items'],
      order: { id: 'DESC' }
    });
  }

// 🟢 PARA EL ADMIN: Ve absolutamente todo con relaciones pobladas
  async findAllAdmin(): Promise<Reservation[]> {
    return await this.dataSource.getRepository(Reservation).find({ 
      // 👇 Ahora sí podemos incluir 'user' y 'order' de forma segura
      relations: ['items', 'user', 'order'], 
      order: { id: 'DESC' }
    });
  }

  // 🟢 NUEVO: Actualizar cualquier campo de la reserva (incluyendo status)
  async update(id: number, updateReservationDto: UpdateReservationDto) {
    const reservationRepository = this.dataSource.getRepository(Reservation);
    const reservation = await reservationRepository.findOneBy({ id });

    if (!reservation) {
      throw new NotFoundException(`La reserva con ID ${id} no existe.`);
    }

    Object.assign(reservation, updateReservationDto);
    return await reservationRepository.save(reservation);
  }

  async remove(id: number) {
    const reservationRepository = this.dataSource.getRepository(Reservation);
    const result = await reservationRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`La reserva con ID ${id} no existe.`);
    }

    return { message: `Reserva ${id} eliminada correctamente.` };
  }

  // Tu lógica original que mantenemos segura
  async approveReservation(id: number): Promise<Reservation> {
    const reservation = await this.dataSource.getRepository(Reservation).findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');

    reservation.status = ReservationStatus.APPROVED;
    return await this.dataSource.getRepository(Reservation).save(reservation);
  }
}