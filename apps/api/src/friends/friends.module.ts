// apps/api/src/friends/friends.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { Friend } from './friend.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Friend, User]),
        UsersModule,
    ],
    providers:   [FriendsService],
    controllers: [FriendsController],
    exports:     [FriendsService],
})
export class FriendsModule {}
