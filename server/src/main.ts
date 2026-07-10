import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import helmet from "helmet"

import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  })
  app.setGlobalPrefix("api")
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  const swaggerConfig = new DocumentBuilder()
    .setTitle("NCBA Rwanda PeopleSuite API")
    .setDescription(
      "HCM platform API — organizational structure, employees, and HR processes."
    )
    .setVersion("0.1.0")
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup("api/docs", app, document)

  const port = process.env.PORT ? Number(process.env.PORT) : 4000
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`NCBA Rwanda PeopleSuite API listening on port ${port}`)
}

bootstrap()
