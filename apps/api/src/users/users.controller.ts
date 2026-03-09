// apps/api/src/users/users.controller.ts

import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser, } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/firebase-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

@UseGuards(FirebaseAuthGuard)
@Controller('v1/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('me')
    getProfile(@CurrentUser() caller: AuthenticatedUser) {
        return this.usersService.getProfile(caller.uid);
    }

    @Patch('me')
    updateProfile(
        @CurrentUser() caller: AuthenticatedUser,
        @Body() dto: UpdateUserDto,
    ) {
        return this.usersService.updateProfile(caller.uid, dto);
    }

    @Post('device')
    @HttpCode(HttpStatus.NO_CONTENT)
    registerDevice(
        @CurrentUser() caller: AuthenticatedUser,
        @Body() dto: RegisterDeviceDto,
    ) {
        return this.usersService.registerDevice(caller.uid, dto);
    }
}
