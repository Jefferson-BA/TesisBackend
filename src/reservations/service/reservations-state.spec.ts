import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReservationsService } from './reservations.service';
import { ReservationStatus } from '../enums/reservations.enums';
import { PromotionsService } from '../../promotions/services/promotions.service';
import { SettingsService } from '../../settings/settings.service';
describe('Reservation state transitions', () => {
  it.each([
    ReservationStatus.CANCELLED,
    ReservationStatus.COMPLETED,
    ReservationStatus.FULLY_PAID,
  ])('does not approve a reservation in %s', async (status) => {
    const manager = { findOne: jest.fn().mockResolvedValue({ id: 1, status }) };
    const dataSource = {
      transaction: (fn: (value: unknown) => unknown) => fn(manager),
    };
    const service = new ReservationsService(
      dataSource as unknown as DataSource,
      {} as PromotionsService,
      {} as SettingsService,
    );
    await expect(service.approveReservation(1)).rejects.toThrow(
      BadRequestException,
    );
  });
  it('does not allow manually marking a reservation as paid', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 1, status: ReservationStatus.APPROVED }),
    };
    const dataSource = {
      transaction: (fn: (value: unknown) => unknown) => fn(manager),
    };
    const service = new ReservationsService(
      dataSource as unknown as DataSource,
      {} as PromotionsService,
      {} as SettingsService,
    );
    await expect(
      service.update(1, { status: ReservationStatus.FULLY_PAID }),
    ).rejects.toThrow(BadRequestException);
  });
});
