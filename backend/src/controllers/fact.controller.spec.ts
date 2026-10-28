import { FactController } from './fact.controller';
import type { FactService } from '../services/fact.service';

describe('FactController', () => {
  it('envia anexos como bytes binários', async () => {
    const content = Uint8Array.from([0x25, 0x50, 0x44, 0x46]);
    const factService = {
      downloadAttachment: jest.fn().mockResolvedValue({
        mimeType: 'application/pdf',
        originalName: 'evidencia.pdf',
        content,
      }),
    };
    const response = {
      type: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    const controller = new FactController(
      factService as unknown as FactService,
    );

    await controller.download(
      { user: { id: 7, role: 'ADMIN_LEADER' } } as never,
      10,
      20,
      response as never,
    );

    expect(response.send).toHaveBeenCalledWith(Buffer.from(content));
    expect(response.send.mock.calls[0][0]).toBeInstanceOf(Buffer);
  });
});
