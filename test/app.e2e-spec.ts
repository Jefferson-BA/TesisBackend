import { Test } from '@nestjs/testing';
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { UsersService } from '../src/users/services/users.service';
import { RolesController } from '../src/roles/controllers/roles.controller';
import { RolesService } from '../src/roles/services/roles.service';
import { ReservationsController } from '../src/reservations/controllers/reservations.controller';
import { ReservationsService } from '../src/reservations/service/reservations.service';
import { SensitiveDataInterceptor } from '../src/common/interceptors/sensitive-data.interceptor';

describe('HTTP authorization and response protection', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let active = true;
  const secret = 'isolated-test-secret-at-least-32-characters';
  const roles = { findAll: jest.fn().mockResolvedValue([]) };
  const reservations = {
    findAllAdmin: jest.fn().mockResolvedValue({
      data: [
        {
          user: {
            name: 'Customer',
            password: 'secret-hash',
            tempPassword: 'secret-hash',
          },
        },
      ],
    }),
    update: jest.fn().mockResolvedValue({ status: 'approved' }),
    remove: jest.fn(),
    approveReservation: jest.fn(),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret })],
      controllers: [RolesController, ReservationsController],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: secret }),
        },
        {
          provide: UsersService,
          useValue: {
            findActiveById: jest.fn((id: number) =>
              Promise.resolve(
                active
                  ? {
                      id,
                      email: 'test@example.com',
                      role: {
                        name: (
                          { 1: 'user', 2: 'admin', 3: 'superadmin' } as Record<
                            number,
                            string
                          >
                        )[id],
                      },
                    }
                  : null,
              ),
            ),
          },
        },
        { provide: RolesService, useValue: roles },
        { provide: ReservationsService, useValue: reservations },
      ],
    }).compile();
    app = module.createNestApplication<INestApplication<App>>();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new SensitiveDataInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
    jwt = module.get(JwtService);
  });
  afterAll(async () => {
    await app.close();
  });
  const token = (id: number) => jwt.sign({ sub: id });
  it('returns 401 for anonymous role management', async () => {
    await request(app.getHttpServer()).get('/roles').expect(401);
  });
  it('returns 403 for customer and admin role management', async () => {
    for (const id of [1, 2])
      await request(app.getHttpServer())
        .get('/roles')
        .auth(token(id), { type: 'bearer' })
        .expect(403);
  });
  it('allows role management for a current superadmin', async () => {
    await request(app.getHttpServer())
      .get('/roles')
      .auth(token(3), { type: 'bearer' })
      .expect(200);
  });
  it.each([
    ['get', '/reservations/admin'],
    ['patch', '/reservations/1'],
    ['delete', '/reservations/1'],
    ['patch', '/reservations/1/approve'],
  ])('denies customer %s %s', async (method, path) => {
    const client = request(app.getHttpServer());
    const response =
      method === 'get'
        ? client.get(path)
        : method === 'delete'
          ? client.delete(path)
          : client.patch(path).send({ status: 'approved' });
    await response.auth(token(1), { type: 'bearer' }).expect(403);
  });
  it('lets admins list reservations and removes hashes from plain nested objects', async () => {
    const response = await request(app.getHttpServer())
      .get('/reservations/admin')
      .auth(token(2), { type: 'bearer' })
      .expect(200);
    expect(JSON.stringify(response.body)).not.toContain('secret-hash');
  });
  it('rejects unrelated fields on status updates', async () => {
    await request(app.getHttpServer())
      .patch('/reservations/1')
      .auth(token(2), { type: 'bearer' })
      .send({ status: 'approved', totalAmount: 1 })
      .expect(400);
  });
  it('revokes access immediately when the current account is unavailable', async () => {
    const previousToken = token(3);
    active = false;
    try {
      await request(app.getHttpServer())
        .get('/roles')
        .auth(previousToken, { type: 'bearer' })
        .expect(401);
    } finally {
      active = true;
    }
  });
});
