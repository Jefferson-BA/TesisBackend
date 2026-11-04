import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
describe('AuthController', () => {
  it('delegates login without changing the credentials', async () => {
    const service = {
      login: jest.fn().mockResolvedValue({ access_token: 'token' }),
    };
    const controller = new AuthController(service as unknown as AuthService);
    const dto: LoginDto = {
      email: 'user@example.com',
      password: 'password123',
    };
    await expect(controller.login(dto)).resolves.toEqual({
      access_token: 'token',
    });
    expect(service.login).toHaveBeenCalledWith(dto);
  });
});
