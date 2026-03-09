// apps/api/src/common/guards/ownership.guard.ts

// This is a base utility for ownership checks within services.
// Rather than a global guard (which would need entity-type awareness),
// ownership is enforced per-service when a resource is fetched.
// Each service method compares the requesting user's uid against the
// resource's owner_id before allowing mutation.

export function assertOwner(
    resourceOwnerId: string,
    requestingUid: string,
): void {
    if (resourceOwnerId !== requestingUid) {
        // Throw a ForbiddenException from @nestjs/common in the calling service
        throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }
}
