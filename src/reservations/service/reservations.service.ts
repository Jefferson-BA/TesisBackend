import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { ReservationItem } from '../entities/reservation-item.entity';
import { Product } from '../../products/entities/product.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { ReservationStatus } from '../enums/reservations.enums';

@Injectable()
export class ReservationsService {
  constructor(private readonly dataSource: DataSource) { }

  /**
   * 🛒 CLIENTE: Registrar una nueva reserva utilizando Transacciones Atómicas
   */
  async createReservation(userId: number, dto: CreateReservationDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const reservationItems: ReservationItem[] = [];

      // Validar cada producto/servicio solicitado en la reserva
      for (const item of dto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product) {
          throw new BadRequestException(
            `El servicio/producto con ID ${item.productId} no existe.`,
          );
        }

        // Acumular montos basados en el precio pactado al momento
        totalAmount += Number(product.price) * item.quantity;

        const resItem = queryRunner.manager.create(ReservationItem, {
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        });

        reservationItems.push(resItem);
      }

      // Crear la cabecera de la reserva con estado inicial PENDING_REVIEW
      const newReservation = queryRunner.manager.create(Reservation, {
        userId,
        eventDate: dto.eventDate,
        serviceStartTime: dto.serviceStartTime,
        guestsCount: dto.guestsCount,
        venueAddress: dto.venueAddress,
        city: dto.city,
        additionalNotes: dto.additionalNotes,
        totalAmount,
        status: ReservationStatus.PENDING_REVIEW, 
        items: reservationItems,
      });

      // Guardar en cascada (cabecera + items)
      await queryRunner.manager.save(newReservation);
      await queryRunner.commitTransaction();

      return newReservation;
    } catch (error) {
      // En caso de cualquier error, se deshacen los cambios (Rollback)
      await queryRunner.rollbackTransaction();

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error al registrar la reserva: ' + (error as Error).message,
      );
    } finally {
      // Liberar siempre el hilo de conexión de la base de datos
      await queryRunner.release();
    }
  }

  /**
   * 👤 CLIENTE: Listar el historial de reservas de la cuenta autenticada
   */
  async findAll(userId: number): Promise<Reservation[]> {
    return await this.dataSource.getRepository(Reservation).find({
      where: { userId },
      relations: ['items'],
      order: { id: 'DESC' },
    });
  }

  /**
   * ⚙️ ADMIN: Vista de monitoreo global con filtros dinámicos, relaciones pobladas y Paginación
   */
  async findAllAdmin(status?: string, page: number = 1, limit: number = 10) {
    const whereClause: any = {};

    if (status === 'active') {
      whereClause.status = In([
        ReservationStatus.PENDING_REVIEW,
        ReservationStatus.APPROVED,
        ReservationStatus.DEPOSIT_PAID,
        ReservationStatus.FULLY_PAID,
      ]);
    } else if (status) {
      whereClause.status = status;
    }

    // 🧮 findAndCount devuelve un arreglo: [los_registros, el_total_absoluto]
    const [reservations, total] = await this.dataSource.getRepository(Reservation).findAndCount({
      where: whereClause,
      relations: ['items', 'user', 'orders'], 
      order: { id: 'DESC' },
      withDeleted: true,
      skip: (page - 1) * limit, // 👈 Cuántos registros saltar
      take: limit,              // 👈 Cuántos registros extraer (Límite por página)
    });

    // 🛡️ Normalización defensiva para el Frontend
    const formattedData = reservations.map((res) => {
      if (res.user) {
        const dbUser = res.user as any;
        res.user = {
          ...res.user,
          name: dbUser.name || `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Cliente sin nombre',
          email: dbUser.email,
          phone: dbUser.phone || 'Sin teléfono',
        } as any;
      }
      return res;
    });

    // 📦 Retornamos la estructura estándar con los datos y la Metadata
    return {
      data: formattedData,
      meta: {
        totalItems: total,
        itemCount: formattedData.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  /**
   * ⚙️ ADMIN/CLIENTE: Actualizar datos o estados de una reserva (PATCH)
   */
  async update(id: number, updateReservationDto: UpdateReservationDto) {
    const reservationRepository = this.dataSource.getRepository(Reservation);

    // Buscamos si existe el registro
    const reservation = await reservationRepository.findOneBy({ id });

    if (!reservation) {
      throw new NotFoundException(
        `La reserva con ID ${id} no existe.`,
      );
    }

    // Fusionamos los cambios que vienen del DTO (ya normalizados a minúsculas)
    Object.assign(reservation, updateReservationDto);

    return await reservationRepository.save(reservation);
  }

  /**
   * ⚙️ ADMIN: Eliminar físicamente una reserva de la base de datos
   */
  async remove(id: number) {
    const reservationRepository = this.dataSource.getRepository(Reservation);

    const result = await reservationRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(
        `La reserva con ID ${id} no existe.`,
      );
    }

    return {
      message: `Reserva ${id} eliminada correctamente.`,
    };
  }

  /**
   * ⚙️ ADMIN: Endpoint rápido para aprobar de forma directa una revisión
   */
  async approveReservation(id: number): Promise<Reservation> {
    const reservationRepository = this.dataSource.getRepository(Reservation);

    const reservation = await reservationRepository.findOne({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    reservation.status = ReservationStatus.APPROVED;

    return await reservationRepository.save(reservation);
  }
}