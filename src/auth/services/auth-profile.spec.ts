import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RolesService } from '../../roles/services/roles.service';
import { UsersService } from '../../users/services/users.service';
import { AuthService } from './auth.service';

describe('AuthService.getProfile', () => {
  const findActiveById = jest.fn();
  const service = new AuthService(
    { findActiveById } as unknown as UsersService,
    {} as RolesService,
    {} as JwtService,
  );

  it('returns current public user fields and excludes credentials and relations', async () => {
    findActiveById.mockResolvedValue({
      id: 1,
      name: 'Ana Torres',
      email: 'ana@example.com',
      phone: '999888777',
      address: 'Av. Principal 123',
      role: { id: 3, name: 'user' },
      password: 'hashed-secret',
      orders: [{ id: 99 }],
    });
    await expect(service.getProfile(1)).resolves.toEqual({
      user: {
        id: 1,
        name: 'Ana Torres',
        email: 'ana@example.com',
        phone: '999888777',
        address: 'Av. Principal 123',
        role: 'user',
      },
    });
    expect(findActiveById).toHaveBeenCalledWith(1);
  });

  it('rejects deleted or disabled accounts', async () => {
    findActiveById.mockResolvedValue(null);
    await expect(service.getProfile(1)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
