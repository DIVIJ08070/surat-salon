import { Module } from '@nestjs/common';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
