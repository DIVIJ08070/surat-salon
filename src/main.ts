import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/global-exception.filter';
import { SuccessInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { oncallMiddleware, startOncall } from './observability/oncall';
import { DatabaseService } from './database/database.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Validation Pipe for class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new SuccessInterceptor(),
  );

  // Global Filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Use helmet for security headers
  const helmet = require('helmet');
  app.use(helmet());

  // Use cookie-parser
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  // OnCall AI observability — per-request telemetry (fail-silent, non-blocking)
  app.use(oncallMiddleware());

  // Enable CORS securely for Auth Cookies
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  
  const config = new DocumentBuilder()
    .setTitle('SuratSalon Hub API')
    .setDescription('Salon & Spa Appointment Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // OnCall AI observability — host sampler with the REAL MySQL pool stats
  startOncall(app.get(DatabaseService).getPool());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger Docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
