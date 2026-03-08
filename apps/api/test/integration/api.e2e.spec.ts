import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FirebaseAuthGuard, AuthenticatedUser } from '../../src/common/guards/firebase-auth.guard';
import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';
import { PaymentsController } from '../../src/payments/payments.controller';
import { PaymentsService } from '../../src/payments/payments.service';
import { SecretsService } from '../../src/secrets/secrets.service';
import { User } from '../../src/users/user.entity';
import { PaymentHandle } from '../../src/payments/payment-handle.entity';
import { Platform } from '../../src/common/enums';

const TEST_CALLER_UID = 'integration-caller';
const TEST_PAYEE_UID = 'integration-payee';

type RepositoryWhere = Record<string, unknown>;

interface MockRepository<T extends { id?: string }> {
  data: T[];
  findOne: jest.Mock<Promise<T | undefined>, any>;
  find: jest.Mock<Promise<T[]>, any>;
  create: jest.Mock<T, any>;
  save: jest.Mock<Promise<T>, any>;
  remove: jest.Mock<Promise<void>, any>;
}

function createMockRepository<T extends { id?: string }>(): MockRepository<T> {
  const data: T[] = [];

  const findOne = jest.fn(async ({ where }: { where?: RepositoryWhere } = {}) => {
    const clause = where ?? {};
    return data.find((item) =>
      Object.entries(clause).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
    );
  });

  const find = jest.fn(async () => [...data]);

  const create = jest.fn((entity: Partial<T>) => ({ ...entity } as T));

  const save = jest.fn(async (entity: T) => {
    if (!entity.id) {
      entity.id = `mock-${data.length + 1}`;
    }
    const existing = data.findIndex((item) => item.id === entity.id);
    if (existing >= 0) {
      data[existing] = { ...data[existing], ...entity };
    } else {
      data.push({ ...entity });
    }
    return entity;
  });

  const remove = jest.fn(async (entity: T) => {
    const index = data.findIndex((item) => item.id === entity.id);
    if (index >= 0) {
      data.splice(index, 1);
    }
  });

  return { data, findOne, find, create, save, remove };
}

describe('TabUp API integration', () => {
  let app: INestApplication | null = null;
  let caller: User;
  let payee: User;

  const userRepo = createMockRepository<User>();
  const handleRepo = createMockRepository<PaymentHandle>();

  const mockGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest();
      const user: AuthenticatedUser = { uid: TEST_CALLER_UID, email: 'caller@example.com' };
      (request as Record<string, unknown>)['user'] = user;
      return true;
    },
  };

  const secretsStub = {
    getSecret: jest.fn().mockResolvedValue('integration-salt'),
    getSecretSync: jest.fn(),
  };

  beforeAll(async () => {
    const now = new Date();

    caller = {
      id: '00000000-0000-4000-8000-000000000001',
      authProviderUid: TEST_CALLER_UID,
      displayName: 'Integration Caller',
      avatarS3Key: null,
      phoneHash: null,
      emailHash: null,
      defaultPlatform: null,
      pushToken: null,
      pushPlatform: null,
      paymentHandles: [],
      sentFriendRequests: [],
      receivedFriendRequests: [],
      bills: [],
      participations: [],
      ledgerEntries: [],
      createdAt: now,
      updatedAt: now,
    } as User;

    payee = {
      id: '00000000-0000-4000-8000-000000000002',
      authProviderUid: TEST_PAYEE_UID,
      displayName: 'Integration Payee',
      avatarS3Key: null,
      phoneHash: null,
      emailHash: null,
      defaultPlatform: null,
      pushToken: null,
      pushPlatform: null,
      paymentHandles: [],
      sentFriendRequests: [],
      receivedFriendRequests: [],
      bills: [],
      participations: [],
      ledgerEntries: [],
      createdAt: now,
      updatedAt: now,
    } as User;

    userRepo.data.push(caller, payee);

    handleRepo.data.push({
      id: 'handle-1',
      userId: payee.id,
      platform: Platform.VENMO,
      handle: 'integration-payee',
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
      user: payee,
    } as PaymentHandle);

    const moduleBuilder = Test.createTestingModule({
      controllers: [UsersController, PaymentsController],
      providers: [
        UsersService,
        PaymentsService,
        { provide: SecretsService, useValue: secretsStub },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(PaymentHandle), useValue: handleRepo },
      ],
    });

    moduleBuilder.overrideGuard(FirebaseAuthGuard).useValue(mockGuard);

    const moduleRef = await moduleBuilder.compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns the authenticated profile from GET /api/v1/users/me', async () => {
    const { body } = await request(app!.getHttpServer()).get('/api/v1/users/me').expect(200);
    expect(body.authProviderUid).toBe(TEST_CALLER_UID);
    expect(body.displayName).toBe('Integration Caller');
  });

  it('generates a Venmo payment link for POST /api/v1/payments/link', async () => {
    const response = await request(app!.getHttpServer())
      .post('/api/v1/payments/link')
      .send({
        payeeUserId: payee.id,
        platform: Platform.VENMO,
        amountCents: 5200,
        note: 'Team dinner #1',
      });

    expect(response.status).toBe(201);
    expect(response.body.platform).toBe(Platform.VENMO);
    expect(response.body.paymentUrl).toContain('venmo://paycharge');
    expect(response.body.webFallback).toContain('note=Team+dinner+1');
  });
});
