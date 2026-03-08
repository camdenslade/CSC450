import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FriendSource, FriendStatus } from '../common/enums';
import { FriendsService } from './friends.service';

describe('FriendsService', () => {
  let service: FriendsService;
  let friendsRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let usersRepo: {
    findOne: jest.Mock;
  };
  let usersService: {
    getProfile: jest.Mock;
    hashContact: jest.Mock;
  };

  beforeEach(() => {
    friendsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn(),
      remove: jest.fn(),
    };
    usersRepo = {
      findOne: jest.fn(),
    };
    usersService = {
      getProfile: jest.fn(),
      hashContact: jest.fn(),
    };

    service = new FriendsService(friendsRepo as any, usersRepo as any, usersService as any);
  });

  it('invite throws when no target matches the hashed contact', async () => {
    usersService.getProfile.mockResolvedValue({ id: 'caller' });
    usersService.hashContact.mockReturnValue('hash');
    usersRepo.findOne.mockResolvedValue(null);

    await expect(
      service.invite('caller-uid', { target: 'phone', value: '+15551234567' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('invite prevents sending a request to oneself', async () => {
    usersService.getProfile.mockResolvedValue({ id: 'caller' });
    usersService.hashContact.mockReturnValue('hash');
    usersRepo.findOne.mockResolvedValue({ id: 'caller' });

    await expect(
      service.invite('caller-uid', { target: 'phone', value: '+15551112222' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('invite rejects when a pending request already exists', async () => {
    usersService.getProfile.mockResolvedValue({ id: 'caller' });
    usersService.hashContact.mockReturnValue('hash');
    usersRepo.findOne.mockResolvedValue({ id: 'target' });
    friendsRepo.findOne.mockResolvedValue({ status: FriendStatus.PENDING });

    await expect(
      service.invite('caller-uid', { target: 'phone', value: '+15553334444' }),
    ).rejects.toThrow(ConflictException);
  });

  it('invite creates a pending friend record', async () => {
    usersService.getProfile.mockResolvedValue({ id: 'caller' });
    usersService.hashContact.mockReturnValue('hash');
    usersRepo.findOne.mockResolvedValue({ id: 'target' });
    friendsRepo.findOne.mockResolvedValue(null);
    friendsRepo.save.mockResolvedValue({
      requesterId: 'caller',
      recipientId: 'target',
      status: FriendStatus.PENDING,
      source: FriendSource.MANUAL,
    });

    const record = await service.invite('caller-uid', { target: 'phone', value: '+15556667777' });
    expect(friendsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterId: 'caller',
        recipientId: 'target',
        status: FriendStatus.PENDING,
      }),
    );
    expect(record.status).toBe(FriendStatus.PENDING);
  });

  it('accept errors when the request does not exist', async () => {
    friendsRepo.findOne.mockResolvedValue(null);
    await expect(service.accept('caller', 'friend')).rejects.toThrow(NotFoundException);
  });

  it('accept forbids users who are not the recipient', async () => {
    friendsRepo.findOne.mockResolvedValue({ recipientId: 'someone-else', status: FriendStatus.PENDING });
    await expect(service.accept('caller', 'friend')).rejects.toThrow(ForbiddenException);
  });

  it('accept requires a pending state', async () => {
    friendsRepo.findOne.mockResolvedValue({ recipientId: 'caller', status: FriendStatus.ACCEPTED });
    await expect(service.accept('caller', 'friend')).rejects.toThrow(BadRequestException);
  });

  it('accept flips the status to accepted', async () => {
    const record = { id: 'friend', recipientId: 'caller', status: FriendStatus.PENDING };
    friendsRepo.findOne.mockResolvedValue(record);
    friendsRepo.save.mockResolvedValue({ ...record, status: FriendStatus.ACCEPTED });

    const updated = await service.accept('caller', 'friend');
    expect(updated.status).toBe(FriendStatus.ACCEPTED);
    expect(friendsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: FriendStatus.ACCEPTED }));
  });

  it('remove errors when the friend record is missing', async () => {
    friendsRepo.findOne.mockResolvedValue(null);
    await expect(service.remove('caller', 'friend')).rejects.toThrow(NotFoundException);
  });

  it('remove forbids callers outside the friendship', async () => {
    friendsRepo.findOne.mockResolvedValue({ requesterId: 'alice', recipientId: 'bob' });
    await expect(service.remove('caller', 'friend')).rejects.toThrow(ForbiddenException);
  });

  it('remove deletes when the caller owns the relationship', async () => {
    const record = { requesterId: 'caller', recipientId: 'recipient' };
    friendsRepo.findOne.mockResolvedValue(record);
    await service.remove('caller', 'friend');
    expect(friendsRepo.remove).toHaveBeenCalledWith(record);
  });
});
