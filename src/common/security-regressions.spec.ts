import { UsersController } from '../users/controllers/users.controller';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesController } from '../roles/controllers/roles.controller';
import { ReservationsController } from '../reservations/controllers/reservations.controller';
import { CreateReservationDto } from '../reservations/dto/create-reservation.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UpdateOrderDto } from '../orders/dto/update-order.dto';
import { UpdateReservationDto } from '../reservations/dto/update-reservation.dto';
import { User } from '../users/entities/user.entity';
import { removeSensitiveData } from './interceptors/sensitive-data.interceptor';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UsersService } from '../users/services/users.service';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';

describe('Security regressions', () => {
  it('does not serialize either password hash, including plain nested copies', () => {
    const user = new User();
    user.password = 'test-hash';
    user.loadTempPassword();
    expect(instanceToPlain(user)).not.toHaveProperty('tempPassword');
    expect(instanceToPlain(user)).not.toHaveProperty('password');
    const output = removeSensitiveData({ data: [{ ...user }] });
    expect(JSON.stringify(output)).not.toContain('test-hash');
  });
  it('restricts role management to superadmin', () => {
    expect(Reflect.getMetadata(ROLES_KEY, RolesController)).toEqual([
      'SUPERADMIN',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, RolesController)).toHaveLength(
      2,
    );
  });
  it.each(['findAllAdmin', 'update', 'remove', 'approve'] as const)(
    'protects reservation operation %s with JWT then roles',
    (method) => {
      const handler = Object.getOwnPropertyDescriptor(
        ReservationsController.prototype,
        method,
      )?.value as object;
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
        'ADMIN',
        'SUPERADMIN',
      ]);
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
      expect(guards).toHaveLength(2);
      expect(guards[1]).toBe(RolesGuard);
    },
  );
  it.each(['create', 'update', 'remove'] as const)(
    'does not allow an admin to bypass privileged user management through %s',
    (method) => {
      const handler = Object.getOwnPropertyDescriptor(
        UsersController.prototype,
        method,
      )?.value as object;
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['SUPERADMIN']);
    },
  );
  it('rejects customers on administrative operations', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () =>
        Object.getOwnPropertyDescriptor(
          ReservationsController.prototype,
          'approve',
        )?.value as object,
      getClass: () => ReservationsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'user' } }) }),
    } as unknown as ExecutionContext;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
  it.each([0, -1])('rejects reservation quantity %s', async (quantity) => {
    const dto = plainToInstance(CreateReservationDto, {
      eventDate: '2027-01-01',
      serviceStartTime: '10:00',
      guestsCount: 1,
      venueAddress: 'Address',
      city: 'Lima',
      acceptedTerms: true,
      acceptedPrivacy: true,
      items: [{ productId: '11111111-1111-4111-8111-111111111111', quantity }],
    });
    expect(await validate(dto)).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'items' })]),
    );
  });
  it('rejects an empty reservation', async () => {
    const dto = plainToInstance(CreateReservationDto, { items: [] });
    expect(await validate(dto)).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'items' })]),
    );
  });
  it.each([UpdateUserDto, UpdateOrderDto, UpdateReservationDto])(
    'rejects overposting in %p',
    async (type) => {
      const dto = Object.assign(new type(), {
        roleId: 1,
        totalAmount: 1,
        passwordHash: 'hash',
      });
      expect(
        (await validate(dto, { whitelist: true, forbidNonWhitelisted: true }))
          .length,
      ).toBeGreaterThan(0);
    },
  );
  it('rejects inactive users and obtains current permissions from the database', async () => {
    const users = { findActiveById: jest.fn().mockResolvedValue(null) };
    const strategy = new JwtStrategy(
      new ConfigService({ JWT_SECRET: 'a'.repeat(32) }),
      users as unknown as UsersService,
    );
    await expect(strategy.validate({ sub: 1 })).rejects.toThrow(
      UnauthorizedException,
    );
    users.findActiveById.mockResolvedValue({
      id: 1,
      email: 'current@example.com',
      role: { name: 'user' },
    });
    await expect(strategy.validate({ sub: 1 })).resolves.toEqual({
      id: 1,
      email: 'current@example.com',
      role: 'user',
    });
  });
});
