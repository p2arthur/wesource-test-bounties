import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createX402Middleware } from './x402/x402.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend development
  app.enableCors();

  // Apply x402 payment middleware (gates POST /api/bounties behind Algorand USDC payment)
  if (process.env.AVM_ADDRESS) {
    app.use(createX402Middleware());
    console.log('💰 x402 payment middleware enabled for POST /api/bounties');
  } else {
    console.warn('⚠️  AVM_ADDRESS not set – x402 payment middleware is DISABLED');
  }

  // Global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('WeSource API')
    .setDescription(
      'WeSource is a repository portal API that allows users to submit projects with GitHub repository URLs. ' +
        'The server automatically enriches data by fetching metadata from the GitHub API.',
    )
    .setVersion('1.0')
    .addTag('Projects', 'Project management endpoints')
    .addTag('Bounties', 'Bounty management endpoints')
    .addTag('Oracle', 'Oracle validation — syncs database with GitHub issue states')
    .addTag('Seed', 'Demo seeding — populate the database with sample projects and bounties')
    .addServer('http://localhost:3000', 'Local development server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 WeSource API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at: http://localhost:${port}/api`);
}
bootstrap();
