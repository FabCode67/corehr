import { Module } from "@nestjs/common"
import { ScheduleModule } from "@nestjs/schedule"

import { EmailLogsModule } from "./email-logs/email-logs.module"
import { EmailTemplatesModule } from "./email-templates/email-templates.module"
import { EmailQueueProcessor } from "./email-queue.processor"
import { EmailService } from "./email.service"
import { MailerService } from "./mailer.service"
import { NotificationPreferencesModule } from "./notification-preferences/notification-preferences.module"

/**
 * ScheduleModule.forRoot() is registered here rather than in AppModule
 * because EmailQueueProcessor (the only @Interval() consumer in the whole
 * app so far) lives in this module — @nestjs/schedule discovers decorated
 * methods app-wide via its own DiscoveryModule regardless of which module
 * called forRoot(), so this is equivalent to registering it at the root
 * and keeps the "new infra dependency" contained to the feature that
 * needed it.
 */
@Module({
  imports: [ScheduleModule.forRoot(), EmailTemplatesModule, EmailLogsModule, NotificationPreferencesModule],
  providers: [MailerService, EmailService, EmailQueueProcessor],
  exports: [EmailService, MailerService],
})
export class EmailModule {}
