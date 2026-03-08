// apps/api/src/groups/groups.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Group, GroupMember]),
        UsersModule,
    ],
    providers:   [GroupsService],
    controllers: [GroupsController],
    exports:     [GroupsService],
})
export class GroupsModule {}
