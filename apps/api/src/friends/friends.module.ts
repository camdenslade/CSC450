// apps/api/src/friends/friends.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { Friend } from './friend.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { S3Module } from '../s3/s3.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Friend, User]),
        UsersModule,
        S3Module,
    ],
    providers:   [FriendsService],
    controllers: [FriendsController],
    exports:     [FriendsService],
})
export class FriendsModule {}
