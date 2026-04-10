import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    await configureApp(app);

    const port = process.env.API_PORT || 3001;
    await app.listen(port);
    console.log(`Emails EST API running on http://localhost:${port}`);
}

bootstrap().catch((error) => {
    console.error('Failed to start Emails EST API', error);
    process.exit(1);
});
