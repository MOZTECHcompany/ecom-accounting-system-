import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AttendanceMethod } from '@prisma/client';

describe('Attendance System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 1. Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 's7896629@gmail.com', // Using the restored admin user
        password: 'password123', // Assuming default password or reset one
      });

    authToken = loginResponse.body.accessToken;
    
    // Get User ID from email
    const user = await prisma.user.findUnique({ where: { email: 's7896629@gmail.com' } });
    userId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.attendanceRecord.deleteMany({ where: { employee: { userId } } });
    await prisma.leaveRequest.deleteMany({ where: { employee: { userId } } });
    await app.close();
  });

  it('/attendance/clock-in (POST)', async () => {
    return request(app.getHttpServer())
      .post('/attendance/clock-in')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        method: AttendanceMethod.WEB,
        latitude: 25.0330,
        longitude: 121.5654,
        ipAddress: '127.0.0.1',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.eventType).toBe('CLOCK_IN');
      });
  });

  it('/attendance/clock-out (POST)', async () => {
    return request(app.getHttpServer())
      .post('/attendance/clock-out')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        method: AttendanceMethod.WEB,
        latitude: 25.0330,
        longitude: 121.5654,
        ipAddress: '127.0.0.1',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.eventType).toBe('CLOCK_OUT');
      });
  });

  it('/attendance/leaves (POST)', async () => {
    // First get a leave type
    const leaveType = await prisma.leaveType.findFirst();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    return request(app.getHttpServer())
      .post('/attendance/leaves')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        leaveTypeId: leaveType.id,
        startAt: tomorrow.toISOString(),
        endAt: dayAfter.toISOString(),
        hours: 8,
        reason: 'E2E Test Leave',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.status).toBe('SUBMITTED');
      });
  });

  it('/attendance/leaves (GET)', async () => {
    return request(app.getHttpServer())
      .get('/attendance/leaves')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });
});
