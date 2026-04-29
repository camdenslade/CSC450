// apps/api/src/groups/groups.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { UsersModule } from '../users/users.module';
import { S3Module } from '../s3/s3.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Group, GroupMember]),
        UsersModule,
        S3Module,
    ],
    providers:   [GroupsService],
    controllers: [GroupsController],
    exports:     [GroupsService],
})
export class GroupsModule {}
