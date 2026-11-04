import { ConfigService } from '@nestjs/config';
import { ChatbotService } from './chatbot.service';
import { ProductsService } from '../../products/services/products.service';
import { SettingsService } from '../../settings/settings.service';
const create = jest.fn<
  Promise<{ choices: { message: { content: string } }[] }>,
  [{ messages: { content: string }[]; max_tokens: number }]
>();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => ({ chat: { completions: { create } } })),
}));
describe('Chatbot catalog', () => {
  it('marks truncated catalogs and does not deny products outside the sample', async () => {
    const products = {
      findAll: jest.fn().mockResolvedValue({
        data: [{ name: 'Menu', price: 100, isAvailable: true }],
        meta: { totalItems: 150 },
      }),
    };
    const settings = { get: jest.fn().mockResolvedValue('configured-key') };
    create.mockResolvedValue({
      choices: [{ message: { content: 'Respuesta' } }],
    });
    const service = new ChatbotService(
      products as unknown as ProductsService,
      settings as unknown as SettingsService,
      new ConfigService({ OPENROUTER_MODEL: 'configured-model' }),
    );
    await expect(service.ask('Consulta')).resolves.toEqual({
      reply: 'Respuesta',
    });
    const call = create.mock.calls[0][0] as {
      messages: { content: string }[];
      max_tokens: number;
    };
    expect(call.messages[0].content).toContain('parcial: true');
    expect(call.messages[0].content).toContain('nunca afirmes que no se vende');
    expect(call.messages[0].content).toContain('pricePEN');
    expect(call.max_tokens).toBe(500);
  });
});
