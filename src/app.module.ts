import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AuthMiddleware } from './auth/middleware/auth.middleware';
import { RolesGuard } from './common/guards/roles.guard';
import { ServiceModule } from './service/service.module';
import { StylistModule } from './stylist/stylist.module';
import { CustomerModule } from './customer/customer.module';
import { StylistLeaveModule } from './stylist-leave/stylist-leave.module';
import { TimeSlotModule } from './time-slot/time-slot.module';
import { AppointmentModule } from './appointment/appointment.module';
import { BillModule } from './bill/bill.module';
import { ReportModule } from './report/report.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,      // ← replaces TypeOrmModule.forRoot (global, available everywhere)
    UserModule,
    AuthModule,
    ServiceModule,
    StylistModule,
    CustomerModule,
    StylistLeaveModule,
    TimeSlotModule,
    AppointmentModule,
    BillModule,
    ReportModule,
    CronModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'v1', method: RequestMethod.GET },
        { path: 'v1/auth/login',   method: RequestMethod.POST },
        { path: 'v1/auth/signup',  method: RequestMethod.POST },
        { path: 'v1/auth/refresh', method: RequestMethod.POST },
        { path: 'v1/auth/logout',  method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
