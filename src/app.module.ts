import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { 
  User, RefreshToken, TokenBlacklist, Service, Stylist, StylistService, 
  Customer, Appointment, AppointmentService, TimeSlot, Bill, StylistLeave 
} from './entities';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AuthMiddleware } from './auth/middleware/auth.middleware';
import { RolesGuard } from './common/guards/roles.guard';
import { ServiceModule } from './service/service.module';
import { StylistModule } from './stylist/stylist.module';
import { CustomerModule } from './customer/customer.module';
import { StylistLeaveModule } from './stylist-leave/stylist-leave.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'surat_salon'),
        entities: [
          User, RefreshToken, TokenBlacklist, Service, Stylist, StylistService, 
          Customer, Appointment, AppointmentService, TimeSlot, Bill, StylistLeave
        ],
        synchronize: false,
        logging: ['log', 'warn', 'error'],
      }),
    }),
    UserModule,
    AuthModule,
    ServiceModule,
    StylistModule,
    CustomerModule,
    StylistLeaveModule,
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
        { path: 'v1/auth/login', method: RequestMethod.POST },
        { path: 'v1/auth/signup', method: RequestMethod.POST },
        { path: 'v1/auth/refresh', method: RequestMethod.POST },
        { path: 'v1/auth/logout', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
