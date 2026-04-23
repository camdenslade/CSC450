// apps/api/src/users/users.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { S3Module } from '../s3/s3.module';

@Module({
    imports:     [TypeOrmModule.forFeature([User]), S3Module],
    providers:   [UsersService],
    controllers: [UsersController],
    exports:     [UsersService],
})
export class UsersModule {}
