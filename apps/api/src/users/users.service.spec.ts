import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Platform } from '../common/enums';
import { SecretsService } from '../secrets/secrets.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let secrets: Partial<SecretsService>;

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    secrets = {
      getSecret: jest.fn().mockResolvedValue('test-hash-salt'),
      getSecretSync: jest.fn(),
    };

    service = new UsersService(usersRepo as any, secrets as SecretsService);
    await service.onModuleInit();
  });

  it('throws when hash salt is unset', () => {
    const freshService = new UsersService(usersRepo as any, secrets as SecretsService);
    expect(() => freshService.hashContact('+15551234567')).toThrow(BadRequestException);
  });

  it('hashes a normalized contact', () => {
    const hashed = service.hashContact('  Foo+BAR ');
    const normalized = 'foo+bar';
    const expected = createHmac('sha256', 'test-hash-salt').update(normalized).digest('hex');
    expect(hashed).toBe(expected);
  });

  it('reloads the hash salt on init', async () => {
    const otherService = new UsersService(usersRepo as any, secrets as SecretsService);
    await otherService.onModuleInit();
    expect(secrets.getSecret).toHaveBeenCalledWith('phone-hash-salt', 'PHONE_HASH_SALT');
  });

  it('getProfile throws when the user is missing', async () => {
    usersRepo.findOne.mockResolvedValue(null);
    await expect(service.getProfile('not-found')).rejects.toThrow(NotFoundException);
  });

  it('updateProfile saves only provided fields', async () => {
    const user = {
      authProviderUid: 'uid',
      displayName: 'Old',
      defaultPlatform: Platform.VENMO,
    };
    usersRepo.findOne.mockResolvedValue(user);
    usersRepo.save.mockResolvedValue({ ...user, displayName: 'New', defaultPlatform: Platform.PAYPAL });

    const updated = await service.updateProfile('uid', {
      displayName: 'New',
      defaultPlatform: Platform.PAYPAL,
    });

    expect(usersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'New',
        defaultPlatform: Platform.PAYPAL,
      }),
    );
    expect(updated.displayName).toBe('New');
    expect(updated.defaultPlatform).toBe(Platform.PAYPAL);
  });

  it('registerDevice attaches token/platform', async () => {
    const user = {
      authProviderUid: 'uid',
      pushToken: null,
      pushPlatform: null,
    };
    usersRepo.findOne.mockResolvedValue(user);
    await service.registerDevice('uid', { pushToken: 'tok', platform: 'ios' });
    expect(usersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        pushToken: 'tok',
        pushPlatform: 'ios',
      }),
    );
  });

  it('updateAvatarKey persists the new S3 key', async () => {
    const user = {
      authProviderUid: 'uid',
      avatarS3Key: null,
    };
    usersRepo.findOne.mockResolvedValue(user);
    await service.updateAvatarKey('uid', 'uploads/avatar.png');
    expect(usersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ avatarS3Key: 'uploads/avatar.png' }),
    );
  });
});
