import { Body, Controller, type INestApplication, Post, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CustomerRequestCreateDto } from '../src/modules/operations/dto/operations.dto';

@Controller('customer-requests-contract')
class CustomerRequestContractController {
  @Post()
  create(@Body() dto: CustomerRequestCreateDto): CustomerRequestCreateDto { return dto; }
}

const validPayload = {
  recipientName: 'Nimmi Perera', recipientPhone: '+94774567890', weightKg: 1.2, serviceLevel: 'EXPRESS', paymentMode: 'PREPAID',
  originHubId: '11111111-1111-4111-8111-111111111111', destinationHubId: '22222222-2222-4222-8222-222222222222',
  pickupAddress: { type: 'PICKUP', line1: '45 Flower Road', locality: 'Colombo', countryCode: 'LK' },
  deliveryAddress: { type: 'DELIVERY', line1: '12 Galle Road', locality: 'Galle', countryCode: 'LK' },
};

describe('Customer request validation contract (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [CustomerRequestContractController] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true }));
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('accepts the dedicated frontend customer request payload', async () => {
    const response = await request(app.getHttpServer()).post('/customer-requests-contract').send(validPayload).expect(201);
    expect(response.body).toMatchObject(validPayload);
  });

  it('continues to reject unexpected and authoritative fields', async () => {
    const response = await request(app.getHttpServer()).post('/customer-requests-contract').send({ ...validPayload, customerId: 'forged', quotedAmount: 1, status: 'APPROVED' }).expect(400);
    expect(response.body.message).toEqual(expect.arrayContaining([
      'property customerId should not exist', 'property quotedAmount should not exist', 'property status should not exist',
    ]));
  });

  it('keeps backend phone validation authoritative', async () => {
    const response = await request(app.getHttpServer()).post('/customer-requests-contract').send({ ...validPayload, recipientPhone: '07712CALL7' }).expect(400);
    expect(response.body.message).toContain('recipientPhone must be a valid phone number');
  });
});
