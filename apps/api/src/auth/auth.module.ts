// apps/api/src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/user.entity';

@Module({
    imports:     [TypeOrmModule.forFeature([User])],
    providers:   [AuthService],
    controllers: [AuthController],
    exports:     [AuthService],
})
export class AuthModule {}
