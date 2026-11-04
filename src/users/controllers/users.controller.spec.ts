import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';
describe('UsersController', () => {
  it('updates only the profile of the authenticated user', async () => {
    const service = { update: jest.fn().mockResolvedValue({ id: 7 }) };
    const controller = new UsersController(service as unknown as UsersService);
    await controller.updateProfile({ user: { id: 7 } }, { name: 'Updated' });
    expect(service.update).toHaveBeenCalledWith(7, { name: 'Updated' });
  });
});
