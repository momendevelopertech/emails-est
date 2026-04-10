import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

export async function createHttpServer() {
    const server = express();
    const app = await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(server),
    );

    await configureApp(app);
    await app.init();

    return server;
}
