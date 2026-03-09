import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Platform } from '../common/enums';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let handlesRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(() => {
    handlesRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn(),
      remove: jest.fn(),
    };
    service = new PaymentsService(handlesRepo as any);
  });

  it('rejects invalid handles up front', async () => {
    await expect(
      service.upsertHandle('user', { platform: Platform.CASHAPP, handle: 'inva$lid' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a new handle when none exists', async () => {
    handlesRepo.findOne.mockResolvedValue(null);
    handlesRepo.save.mockResolvedValue({ id: 'handle-1', userId: 'user', platform: Platform.VENMO, handle: 'john' });

    const saved = await service.upsertHandle('user', { platform: Platform.VENMO, handle: 'john' });
    expect(handlesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user',
        platform: Platform.VENMO,
        handle: 'john',
      }),
    );
    expect(saved.handle).toBe('john');
  });

  it('updates an existing handle and resets verification', async () => {
    const existing = {
      id: 'handle-1',
      userId: 'user',
      platform: Platform.PAYPAL,
      handle: 'old',
      verifiedAt: new Date(0),
    };
    handlesRepo.findOne.mockResolvedValue(existing);
    handlesRepo.save.mockResolvedValue({ ...existing, handle: 'new', verifiedAt: null });

    const result = await service.upsertHandle('user', { platform: Platform.PAYPAL, handle: 'new' });
    expect(handlesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: 'new',
        verifiedAt: null,
      }),
    );
    expect(result.handle).toBe('new');
  });

  it('listHandles returns every handle for a user', async () => {
    handlesRepo.find.mockResolvedValue([{ id: 'handle-1' }]);
    const result = await service.listHandles('user');
    expect(result).toEqual([{ id: 'handle-1' }]);
  });

  it('removeHandle errors when no handle is registered', async () => {
    handlesRepo.findOne.mockResolvedValue(null);
    await expect(service.removeHandle('user', Platform.CASHAPP)).rejects.toThrow(NotFoundException);
  });

  it('removeHandle rejects when the caller does not own the handle', async () => {
    handlesRepo.findOne.mockResolvedValue({ userId: 'other' });
    await expect(service.removeHandle('user', Platform.CASHAPP)).rejects.toThrow(ForbiddenException);
  });

  it('removeHandle drops the handle when owned by the caller', async () => {
    const handle = { userId: 'user', platform: Platform.CASHAPP };
    handlesRepo.findOne.mockResolvedValue(handle);
    await service.removeHandle('user', Platform.CASHAPP);
    expect(handlesRepo.remove).toHaveBeenCalledWith(handle);
  });

  it('generateLink rejects zero or negative amounts', async () => {
    await expect(service.generateLink('user', Platform.VENMO, 0)).rejects.toThrow(BadRequestException);
  });

  it('generateLink errors when the payee has no handle', async () => {
    handlesRepo.findOne.mockResolvedValue(null);
    await expect(service.generateLink('user', Platform.VENMO, 100)).rejects.toThrow(NotFoundException);
  });

  it('generateLink builds a sanitized Venmo deep link', async () => {
    handlesRepo.findOne.mockResolvedValue({
      userId: 'payee',
      platform: Platform.VENMO,
      handle: 'payee',
    });

    const link = await service.generateLink('payee', Platform.VENMO, 12345, 'Dinner #1!');
    expect(link.platform).toBe(Platform.VENMO);
    expect(link.paymentUrl).toContain('venmo://');
    expect(link.webFallback).toContain('note=Dinner+1');
  });

  it('generateLink produces PayPal links with correct decimals', async () => {
    handlesRepo.findOne.mockResolvedValue({
      userId: 'payee',
      platform: Platform.PAYPAL,
      handle: 'payee',
    });

    const link = await service.generateLink('payee', Platform.PAYPAL, 1500);
    expect(link.paymentUrl).toContain('paypal.me/payee/15.00');
  });
});
