import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentAttempt } from './entities/payment-attempt.entity';
import { CulqiService } from './service/culqi.service';
import { PaymentService } from './service/payment.service';
import { MailModule } from '../mail/mail.module';
@Module({
  imports: [TypeOrmModule.forFeature([PaymentAttempt]), MailModule],
  providers: [CulqiService, PaymentService],
  exports: [CulqiService, PaymentService],
})
export class PaymentsModule {}
