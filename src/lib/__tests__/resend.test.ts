import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: sendMock,
    },
  })),
}));

describe('sendContractFinalizedEmail', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: 'email_123' }, error: null });
  });

  it('attaches both the signed contract and the invoice when invoice data is provided', async () => {
    const { sendContractFinalizedEmail } = await import('../resend');

    await sendContractFinalizedEmail(
      'cliente@example.com',
      'Cliente Test',
      new Uint8Array([37, 80, 68, 70]),
      new Uint8Array([37, 80, 68, 70, 45]),
      20000
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];

    expect(payload.to).toBe('cliente@example.com');
    expect(payload.attachments).toHaveLength(2);
    expect(payload.attachments[0]).toMatchObject({
      filename: 'Contrato_VideoMarketing_Sevilla_Cliente_Test.pdf',
      contentType: 'application/pdf',
    });
    expect(payload.attachments[1]).toMatchObject({
      filename: 'Factura_F-20000_VideoMarketing_Sevilla.pdf',
      contentType: 'application/pdf',
    });
    expect(Buffer.isBuffer(payload.attachments[0].content)).toBe(true);
    expect(Buffer.isBuffer(payload.attachments[1].content)).toBe(true);
  });

  it('throws when Resend rejects the email payload', async () => {
    const { sendContractFinalizedEmail } = await import('../resend');
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid attachment', name: 'validation_error' },
    });

    await expect(
      sendContractFinalizedEmail(
        'cliente@example.com',
        'Cliente Test',
        new Uint8Array([37, 80, 68, 70]),
        new Uint8Array([37, 80, 68, 70, 45]),
        20000
      )
    ).rejects.toThrow('Error enviando contrato finalizado: Invalid attachment');
  });

  it('sends the completed contract and invoice to the owner email', async () => {
    const { sendContractCompletedOwnerEmail } = await import('../resend');

    await sendContractCompletedOwnerEmail(
      'cliente@example.com',
      'Cliente Test',
      'Contrato Demo',
      new Uint8Array([37, 80, 68, 70]),
      new Uint8Array([37, 80, 68, 70, 45]),
      20001
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];

    expect(payload.to).toBe('laeseprod@gmail.com');
    expect(payload.replyTo).toBe('cliente@example.com');
    expect(payload.subject).toContain('Contrato Demo');
    expect(payload.attachments).toHaveLength(2);
    expect(payload.attachments[0].filename).toBe('Contrato_VideoMarketing_Sevilla_Cliente_Test.pdf');
    expect(payload.attachments[1].filename).toBe('Factura_F-20001_VideoMarketing_Sevilla.pdf');
  });
});
