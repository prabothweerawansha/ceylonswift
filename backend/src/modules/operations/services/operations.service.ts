import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  CustomerRequestStatus,
  EmployeeStatus,
  HubStatus,
  MembershipStatus,
  PackageAssignmentStatus,
  PackageStatus,
  PaymentMode,
  Prisma,
  RiderStatus,
  TrackingEventType,
  TrackingVisibility,
  type Address,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import type {
  AssignmentDto,
  CancelDto,
  CustomerRequestCreateDto,
  CustomerRequestUpdateDto,
  HubCreateDto,
  HubQueryDto,
  HubStatusDto,
  HubUpdateDto,
  OperationalListQueryDto,
  PackageCreateDto,
  PackageUpdateDto,
  RequestListQueryDto,
  StatusTransitionDto,
  UnassignDto,
} from '../dto/operations.dto';
import { OperationsRateLimitService } from './operations-rate-limit.service';
import { PackageTransitionService, RIDER_TRANSITIONS } from './package-transition.service';
import { PricingService } from './pricing.service';

type Tx = Prisma.TransactionClient;
const ACTIVE_ASSIGNMENTS = [PackageAssignmentStatus.PENDING, PackageAssignmentStatus.ACCEPTED, PackageAssignmentStatus.ACTIVE];
const ASSIGNABLE_STATUSES = new Set<PackageStatus>([
  PackageStatus.CONFIRMED,
  PackageStatus.AWAITING_PICKUP,
  PackageStatus.RECEIVED_AT_DESTINATION_HUB,
  PackageStatus.DELIVERY_ATTEMPTED,
  PackageStatus.DELIVERY_FAILED,
]);
const CANCELLABLE_STATUSES = new Set<PackageStatus>([
  PackageStatus.DRAFT,
  PackageStatus.PENDING_CONFIRMATION,
  PackageStatus.CONFIRMED,
  PackageStatus.AWAITING_PICKUP,
]);

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly transitions: PackageTransitionService,
    private readonly limits: OperationsRateLimitService,
  ) {}

  async createRequest(dto: CustomerRequestCreateDto, context: AuthorizationContext, requestId: string) {
    this.requirePersonal(context, 'package.create');
    const route = await this.route(dto.originHubId, dto.destinationHubId);
    const quote = await this.pricing.calculate(dto);
    return this.prisma.$transaction(async (tx) => {
      const pickup = await this.createAddress(tx, dto.pickupAddress, context.userId, null);
      const delivery = await this.createAddress(tx, dto.deliveryAddress, context.userId, null);
      const request = await tx.customerRequest.create({
        data: {
          organizationId: route.organizationId,
          branchId: route.origin.branchId,
          customerId: context.userId,
          pickupAddressId: pickup.id,
          deliveryAddressId: delivery.id,
          requestCode: this.publicCode('REQ'),
          status: CustomerRequestStatus.DRAFT,
          packageDetails: this.requestDetails(dto),
          quotedAmount: quote.amount,
          currency: quote.currency,
        },
        select: this.requestSelect(),
      });
      await this.audit(tx, 'CUSTOMER_REQUEST_CREATED', requestId, context, 'CustomerRequest', request.id);
      return this.safeRequest(request);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async requests(query: RequestListQueryDto, context: AuthorizationContext) {
    const where = this.requestScope(context, query.branchId);
    const rows = await this.prisma.customerRequest.findMany({
      where: {
        ...where,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search ? { requestCode: { contains: query.search.toUpperCase(), mode: 'insensitive' } } : {}),
      },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: query.sort }, { id: query.sort }],
      select: this.requestSelect(),
    });
    return this.page(rows, query.limit, (row) => this.safeRequest(row));
  }

  async request(id: string, context: AuthorizationContext) {
    const row = await this.prisma.customerRequest.findFirst({
      where: { id, ...this.requestScope(context) },
      select: this.requestSelect(),
    });
    if (!row) throw this.notFound();
    return this.safeRequest(row);
  }

  async updateRequest(id: string, dto: CustomerRequestUpdateDto, context: AuthorizationContext, requestId: string) {
    const current = await this.requestRecord(id, context);
    if (current.status !== CustomerRequestStatus.DRAFT) throw this.stateConflict('Only draft requests can be edited.');
    const details = this.parseDetails(current.packageDetails);
    const merged = { ...details, ...dto };
    const route = await this.route(merged.originHubId, merged.destinationHubId);
    if (route.organizationId !== current.organizationId) throw this.denied();
    const quote = await this.pricing.calculate(merged);
    await this.prisma.$transaction(async (tx) => {
      if (dto.pickupAddress) await tx.address.update({ where: { id: current.pickupAddressId }, data: dto.pickupAddress });
      if (dto.deliveryAddress) await tx.address.update({ where: { id: current.deliveryAddressId }, data: dto.deliveryAddress });
      await tx.customerRequest.update({
        where: { id },
        data: { packageDetails: this.requestDetails(merged), quotedAmount: quote.amount, currency: quote.currency, branchId: route.origin.branchId },
      });
      await this.audit(tx, 'CUSTOMER_REQUEST_UPDATED', requestId, context, 'CustomerRequest', id);
    });
    return this.request(id, context);
  }

  async submitRequest(id: string, context: AuthorizationContext, requestId: string) {
    return this.changeRequestState(id, CustomerRequestStatus.DRAFT, CustomerRequestStatus.PENDING, 'CUSTOMER_REQUEST_SUBMITTED', context, requestId);
  }

  async cancelRequest(id: string, context: AuthorizationContext, requestId: string) {
    const current = await this.requestRecord(id, context);
    if (current.status !== CustomerRequestStatus.DRAFT && current.status !== CustomerRequestStatus.PENDING) {
      throw this.stateConflict('This request can no longer be cancelled.');
    }
    return this.changeRequestState(id, current.status, CustomerRequestStatus.CANCELLED, 'CUSTOMER_REQUEST_CANCELLED', context, requestId);
  }

  async convertRequest(id: string, context: AuthorizationContext, requestId: string) {
    const current = await this.requestRecord(id, context);
    if (current.status !== CustomerRequestStatus.PENDING || current.resultingPackageId) {
      throw this.stateConflict('Only a submitted, unconverted request can be converted.');
    }
    const details = this.parseDetails(current.packageDetails);
    const route = await this.route(details.originHubId, details.destinationHubId);
    const quote = await this.pricing.calculate(details);
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.customerRequest.updateMany({
        where: { id, status: CustomerRequestStatus.PENDING, resultingPackageId: null },
        data: { status: CustomerRequestStatus.APPROVED, reviewedById: context.userId, reviewedAt: new Date() },
      });
      if (claimed.count !== 1) throw this.stateConflict('The request has already been converted.');
      const pkg = await this.createPackageRecord(tx, {
        organizationId: current.organizationId,
        customerId: current.customerId,
        originBranchId: route.origin.branchId,
        destinationBranchId: route.destination.branchId,
        originHubId: route.origin.id,
        destinationHubId: route.destination.id,
        originAddressId: current.pickupAddressId,
        destinationAddressId: current.deliveryAddressId,
        recipientName: details.recipientName,
        recipientPhone: details.recipientPhone,
        weightKg: details.weightKg,
        serviceLevel: details.serviceLevel.toUpperCase(),
        paymentMode: details.paymentMode,
        codAmount: details.paymentMode === PaymentMode.COD ? details.codAmount ?? 0 : null,
        quotedAmount: quote.amount,
        currency: quote.currency,
        status: PackageStatus.PENDING_CONFIRMATION,
      }, context, requestId);
      await tx.customerRequest.update({ where: { id }, data: { resultingPackageId: pkg.id } });
      await this.audit(tx, 'CUSTOMER_REQUEST_CONVERTED', requestId, context, 'CustomerRequest', id, { packageId: pkg.id });
      return this.safePackage(pkg);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async createPackage(dto: PackageCreateDto, context: AuthorizationContext, requestId: string) {
    this.requirePermission(context, 'package.create');
    const route = await this.route(dto.originHubId, dto.destinationHubId);
    const customerId = context.workspaceType === 'PERSONAL' ? context.userId : dto.customerId ?? null;
    if (context.workspaceType === 'ORGANIZATION' && route.organizationId !== context.organizationId) throw this.denied();
    if (context.workspaceType === 'ORGANIZATION' && customerId) {
      const customer = await this.prisma.user.findFirst({
        where: { id: customerId, deletedAt: null, roles: { some: { organizationId: route.organizationId, revokedAt: null, role: { key: { in: ['CUSTOMER', 'VIP_CUSTOMER'] } } } } },
        select: { id: true },
      });
      if (!customer) throw this.notFound();
    }
    const quote = await this.pricing.calculate(dto);
    return this.prisma.$transaction(async (tx) => {
      const origin = await this.createAddress(tx, dto.pickupAddress, customerId, route.organizationId);
      const destination = await this.createAddress(tx, dto.deliveryAddress, customerId, route.organizationId);
      const pkg = await this.createPackageRecord(tx, {
        organizationId: route.organizationId,
        customerId,
        originBranchId: route.origin.branchId,
        destinationBranchId: route.destination.branchId,
        originHubId: route.origin.id,
        destinationHubId: route.destination.id,
        originAddressId: origin.id,
        destinationAddressId: destination.id,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        weightKg: dto.weightKg,
        serviceLevel: dto.serviceLevel.toUpperCase(),
        paymentMode: dto.paymentMode,
        codAmount: dto.paymentMode === PaymentMode.COD ? dto.codAmount ?? 0 : null,
        quotedAmount: quote.amount,
        currency: quote.currency,
        status: PackageStatus.PENDING_CONFIRMATION,
      }, context, requestId);
      return this.safePackage(pkg);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async packages(query: OperationalListQueryDto, context: AuthorizationContext) {
    const where = this.packageScope(context, query.branchId);
    const rows = await this.prisma.package.findMany({
      where: {
        ...where,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(query.riderId ? { assignments: { some: { riderId: query.riderId, status: { in: ACTIVE_ASSIGNMENTS } } } } : {}),
        ...(query.search ? { OR: [
          { trackingCode: { contains: query.search.toUpperCase(), mode: 'insensitive' } },
          { recipientName: { contains: query.search, mode: 'insensitive' } },
        ] } : {}),
        ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
      },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: query.sort }, { id: query.sort }],
      select: this.packageSelect(),
    });
    return this.page(rows, query.limit, (row) => this.safePackage(row));
  }

  async package(id: string, context: AuthorizationContext) {
    const row = await this.packageRecord(id, context);
    return this.safePackage(row);
  }

  async updatePackage(id: string, dto: PackageUpdateDto, context: AuthorizationContext, requestId: string) {
    this.requirePermission(context, 'package.update');
    const current = await this.packageRecord(id, context);
    if (current.status !== PackageStatus.DRAFT && current.status !== PackageStatus.PENDING_CONFIRMATION) {
      throw this.stateConflict('Package details can no longer be edited.');
    }
    if (!current.originHub?.id || !(dto.destinationHubId ?? current.destinationHub?.id)) throw this.stateConflict('The package route is incomplete.');
    const route = await this.route(current.originHub.id, dto.destinationHubId ?? current.destinationHub!.id);
    const quote = await this.pricing.calculate({
      weightKg: dto.weightKg ?? Number(current.weightKg),
      originHubId: current.originHub.id,
      destinationHubId: dto.destinationHubId ?? current.destinationHub!.id,
      serviceLevel: dto.serviceLevel ?? current.serviceLevel,
      paymentMode: current.paymentMode,
      ...(current.paymentMode === PaymentMode.COD ? { codAmount: Number(current.codAmount ?? 0) } : {}),
    });
    await this.prisma.$transaction(async (tx) => {
      if (dto.destinationAddress && current.destinationAddressId) {
        await tx.address.update({ where: { id: current.destinationAddressId }, data: dto.destinationAddress });
      }
      const changed = await tx.package.updateMany({
        where: { id, version: dto.expectedVersion },
        data: {
          ...(dto.recipientName ? { recipientName: dto.recipientName } : {}),
          ...(dto.recipientPhone ? { recipientPhone: dto.recipientPhone } : {}),
          ...(dto.weightKg ? { weightKg: dto.weightKg } : {}),
          ...(dto.serviceLevel ? { serviceLevel: dto.serviceLevel.toUpperCase() } : {}),
          ...(dto.destinationHubId ? { destinationHubId: dto.destinationHubId, destinationBranchId: route.destination.branchId } : {}),
          quotedAmount: quote.amount,
          currency: quote.currency,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw this.versionConflict();
      await this.audit(tx, 'PACKAGE_UPDATED', requestId, context, 'Package', id, { fields: Object.keys(dto).filter((key) => key !== 'expectedVersion') });
    });
    return this.package(id, context);
  }

  async transition(id: string, dto: StatusTransitionDto, context: AuthorizationContext, requestId: string) {
    const current = await this.packageRecord(id, context);
    this.transitions.assertAllowed(current.status, dto.status);
    const isRider = context.roles.includes('RIDER') && !context.permissions.has('package.update');
    const isCustomerCancellation = context.workspaceType === 'PERSONAL' && current.customerId === context.userId && dto.status === PackageStatus.CANCELLED;
    if (isRider) {
      this.requirePermission(context, 'package.deliver');
      if (!RIDER_TRANSITIONS.has(`${current.status}:${dto.status}`)) throw this.denied();
      await this.requireActiveRiderAssignment(current.id, context.userId);
    } else if (!isCustomerCancellation) {
      this.requireAnyPermission(context, ['package.update', 'tracking.update']);
    }
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.package.updateMany({
        where: { id, version: dto.expectedVersion, status: current.status },
        data: {
          status: dto.status,
          version: { increment: 1 },
          ...(dto.status === PackageStatus.CONFIRMED ? { confirmedAt: new Date() } : {}),
          ...(dto.status === PackageStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
          ...(dto.status === PackageStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
        },
      });
      if (changed.count !== 1) throw this.versionConflict();
      await this.appendTracking(tx, current.id, this.transitions.eventFor(dto.status), dto.publicMessage ?? this.defaultMessage(dto.status), context.userId, dto.hubId);
      if (dto.status === PackageStatus.DELIVERED) await this.completeAssignment(tx, current.id);
      await this.audit(tx, this.statusAudit(dto.status), requestId, context, 'Package', id, { from: current.status, to: dto.status });
      return this.safePackage(await tx.package.findUniqueOrThrow({ where: { id }, select: this.packageSelect() }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async cancelPackage(id: string, dto: CancelDto, context: AuthorizationContext, requestId: string) {
    const current = await this.packageRecord(id, context);
    if (!CANCELLABLE_STATUSES.has(current.status)) throw this.stateConflict('This package can no longer be cancelled.');
    const ownCustomer = context.workspaceType === 'PERSONAL' && current.customerId === context.userId;
    if (!ownCustomer) this.requirePermission(context, 'package.update');
    return this.transition(id, { status: PackageStatus.CANCELLED, expectedVersion: dto.expectedVersion, publicMessage: 'Shipment cancelled.' }, context, requestId);
  }

  async tracking(id: string, context: AuthorizationContext) {
    await this.packageRecord(id, context);
    return this.prisma.trackingEvent.findMany({
      where: { packageId: id, visibility: { in: this.trackingVisibility(context) } },
      select: this.trackingSelect(false),
      orderBy: [{ sequence: 'asc' }, { eventAt: 'asc' }],
    });
  }

  async publicTracking(code: string) {
    const normalized = code.trim().toUpperCase();
    this.limits.consume(`tracking:${normalized}`, 30, 60_000);
    const pkg = await this.prisma.package.findUnique({
      where: { trackingCode: normalized },
      select: {
        trackingCode: true,
        status: true,
        updatedAt: true,
        recipientName: true,
        originHub: { select: { name: true, addressData: true } },
        destinationHub: { select: { name: true, addressData: true } },
        trackingEvents: {
          where: { visibility: TrackingVisibility.PUBLIC },
          select: this.trackingSelect(true),
          orderBy: [{ sequence: 'asc' }, { eventAt: 'asc' }],
        },
      },
    });
    if (!pkg) throw new NotFoundException({ code: 'TRACKING_NOT_FOUND', message: 'No shipment was found for that tracking code.', details: null });
    return {
      trackingCode: pkg.trackingCode,
      status: pkg.status,
      recipient: this.maskName(pkg.recipientName),
      origin: this.safeHubPlace(pkg.originHub),
      destination: this.safeHubPlace(pkg.destinationHub),
      lastUpdatedAt: pkg.updatedAt,
      timeline: pkg.trackingEvents,
    };
  }

  async assignments(id: string, context: AuthorizationContext) {
    await this.packageRecord(id, context);
    return this.prisma.packageAssignment.findMany({
      where: { packageId: id },
      select: this.assignmentSelect(),
      orderBy: { assignedAt: 'desc' },
    });
  }

  assign(id: string, dto: AssignmentDto, context: AuthorizationContext, requestId: string) {
    return this.assignInternal(id, dto, context, requestId, false);
  }

  reassign(id: string, dto: AssignmentDto, context: AuthorizationContext, requestId: string) {
    return this.assignInternal(id, dto, context, requestId, true);
  }

  async unassign(id: string, dto: UnassignDto, context: AuthorizationContext, requestId: string) {
    this.requirePermission(context, 'package.assign');
    const pkg = await this.packageRecord(id, context);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.packageAssignment.findFirst({ where: { packageId: id, status: { in: ACTIVE_ASSIGNMENTS } }, orderBy: { assignedAt: 'desc' } });
      if (!current) throw this.stateConflict('The package has no active rider assignment.');
      const changed = await tx.package.updateMany({ where: { id, version: dto.expectedVersion }, data: { version: { increment: 1 } } });
      if (changed.count !== 1) throw this.versionConflict();
      await tx.packageAssignment.update({ where: { id: current.id }, data: { status: PackageAssignmentStatus.CANCELLED, cancelledAt: new Date(), notes: dto.reason } });
      await tx.riderProfile.update({ where: { id: current.riderId }, data: { riderStatus: RiderStatus.AVAILABLE } });
      await this.appendTracking(tx, id, TrackingEventType.NOTE, 'Rider assignment updated.', context.userId);
      await this.audit(tx, 'PACKAGE_UNASSIGNED', requestId, context, 'Package', id, { previousRiderId: current.riderId });
      return this.safePackage(await tx.package.findUniqueOrThrow({ where: { id: pkg.id }, select: this.packageSelect() }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async riderAssignments(riderId: string, context: AuthorizationContext) {
    const rider = await this.prisma.riderProfile.findFirst({ where: { id: riderId }, select: { id: true, userId: true } });
    if (!rider) throw this.notFound();
    const isSelf = rider.userId === context.userId;
    if (!isSelf) this.requireAnyPermission(context, ['rider.read', 'package.assign']);
    if (context.roles.includes('RIDER') && !isSelf) throw this.denied();
    return this.prisma.packageAssignment.findMany({
      where: {
        riderId,
        status: { in: ACTIVE_ASSIGNMENTS },
        ...(context.organizationId ? { package: { organizationId: context.organizationId } } : {}),
        ...(context.branchId ? { branchId: context.branchId } : {}),
      },
      select: { ...this.assignmentSelect(), package: { select: this.riderPackageSelect() } },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async myRiderAssignments(context: AuthorizationContext) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId: context.userId }, select: { id: true } });
    if (!rider) throw this.notFound();
    return this.riderAssignments(rider.id, context);
  }

  async hubs(query: HubQueryDto) {
    const rows = await this.prisma.hub.findMany({
      where: {
        deletedAt: null,
        status: query.status ?? HubStatus.ACTIVE,
        ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { code: { contains: query.search.toUpperCase(), mode: 'insensitive' } }] } : {}),
      },
      select: this.hubSelect(),
      orderBy: [{ name: 'asc' }],
    });
    return Promise.all(rows.map(async (hub) => ({
      ...this.safeHub(hub),
      activePackages: await this.prisma.package.count({ where: { deletedAt: null, status: { notIn: [PackageStatus.DELIVERED, PackageStatus.CANCELLED, PackageStatus.RETURNED] }, OR: [{ originHubId: hub.id }, { destinationHubId: hub.id }] } }),
      activeRiders: await this.prisma.riderProfile.count({ where: { riderStatus: { in: [RiderStatus.AVAILABLE, RiderStatus.ASSIGNED] }, user: { employeeProfile: { primaryBranchId: hub.branchId } } } }),
    })));
  }

  async hub(id: string) {
    const row = await this.prisma.hub.findFirst({ where: { id, deletedAt: null }, select: this.hubSelect() });
    if (!row) throw this.notFound();
    return this.safeHub(row);
  }

  async createHub(dto: HubCreateDto, context: AuthorizationContext, requestId: string) {
    this.requireOrganization(context, 'hub.manage');
    const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, organizationId: context.organizationId!, deletedAt: null } });
    if (!branch || (context.branchId && context.branchId !== branch.id)) throw this.denied();
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.hub.create({ data: { organizationId: context.organizationId!, branchId: branch.id, code: dto.code.toUpperCase(), name: dto.name, status: dto.status, capacity: dto.capacity, addressData: dto.district ? { district: dto.district } : undefined }, select: this.hubSelect() });
      await this.audit(tx, 'HUB_CREATED', requestId, context, 'Hub', created.id);
      return created;
    });
    return this.safeHub(row);
  }

  async updateHub(id: string, dto: HubUpdateDto, context: AuthorizationContext, requestId: string) {
    const hub = await this.scopedHub(id, context, 'hub.manage');
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.hub.update({ where: { id: hub.id }, data: { name: dto.name, capacity: dto.capacity, ...(dto.district ? { addressData: { district: dto.district } } : {}) }, select: this.hubSelect() });
      await this.audit(tx, 'HUB_UPDATED', requestId, context, 'Hub', id, { fields: Object.keys(dto) });
      return updated;
    });
    return this.safeHub(row);
  }

  async setHubStatus(id: string, dto: HubStatusDto, context: AuthorizationContext, requestId: string) {
    const hub = await this.scopedHub(id, context, 'hub.manage');
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.hub.update({ where: { id: hub.id }, data: { status: dto.status }, select: this.hubSelect() });
      await this.audit(tx, 'HUB_STATUS_CHANGED', requestId, context, 'Hub', id, { status: dto.status });
      return updated;
    });
    return this.safeHub(row);
  }

  private async assignInternal(id: string, dto: AssignmentDto, context: AuthorizationContext, requestId: string, reassign: boolean) {
    this.requireOrganization(context, 'package.assign');
    const pkg = await this.packageRecord(id, context);
    if (!ASSIGNABLE_STATUSES.has(pkg.status)) throw this.stateConflict('The package is not in an assignable state.');
    const rider = await this.prisma.riderProfile.findFirst({
      where: {
        id: dto.riderId,
        riderStatus: RiderStatus.AVAILABLE,
        user: {
          accountStatus: AccountStatus.ACTIVE,
          employeeProfile: { employeeStatus: EmployeeStatus.ACTIVE, ...(context.branchId ? { primaryBranchId: context.branchId } : {}) },
          memberships: { some: { organizationId: context.organizationId!, status: MembershipStatus.ACTIVE, ...(context.branchId ? { defaultBranchId: context.branchId } : {}) } },
        },
      },
      include: { user: { select: { employeeProfile: { select: { primaryBranchId: true } } } } },
    });
    if (!rider?.user.employeeProfile?.primaryBranchId) throw this.denied();
    const branchId = context.branchId ?? pkg.originBranchId ?? pkg.destinationBranchId;
    if (!branchId || rider.user.employeeProfile.primaryBranchId !== branchId) throw this.denied();
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.packageAssignment.findFirst({ where: { packageId: id, status: { in: ACTIVE_ASSIGNMENTS } }, orderBy: { assignedAt: 'desc' } });
      if (existing && !reassign) throw this.stateConflict('The package already has an active rider assignment.');
      if (!existing && reassign) throw this.stateConflict('The package has no active assignment to replace.');
      if (existing?.riderId === rider.id) throw this.stateConflict('The selected rider is already assigned.');
      const changed = await tx.package.updateMany({ where: { id, version: dto.expectedVersion }, data: { version: { increment: 1 } } });
      if (changed.count !== 1) throw this.versionConflict();
      if (existing) {
        await tx.packageAssignment.update({ where: { id: existing.id }, data: { status: PackageAssignmentStatus.CANCELLED, cancelledAt: new Date() } });
        await tx.riderProfile.update({ where: { id: existing.riderId }, data: { riderStatus: RiderStatus.AVAILABLE } });
      }
      await tx.packageAssignment.create({ data: { packageId: id, riderId: rider.id, branchId, assignedById: context.userId, status: PackageAssignmentStatus.ACTIVE, acceptedAt: new Date(), notes: dto.notes } });
      await tx.riderProfile.update({ where: { id: rider.id }, data: { riderStatus: RiderStatus.ASSIGNED } });
      await this.appendTracking(tx, id, TrackingEventType.NOTE, reassign ? 'A rider was reassigned.' : 'A rider was assigned.', context.userId);
      await this.audit(tx, reassign ? 'PACKAGE_REASSIGNED' : 'PACKAGE_ASSIGNED', requestId, context, 'Package', id, { riderId: rider.id, previousRiderId: existing?.riderId ?? null });
      return this.safePackage(await tx.package.findUniqueOrThrow({ where: { id }, select: this.packageSelect() }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async createPackageRecord(tx: Tx, data: Omit<Prisma.PackageUncheckedCreateInput, 'trackingCode'>, context: AuthorizationContext, requestId: string) {
    const pkg = await tx.package.create({ data: { ...data, trackingCode: this.publicCode('CSW') }, select: this.packageSelect() });
    await this.appendTracking(tx, pkg.id, TrackingEventType.CREATED, 'Shipment registered with CeylonSwift.', context.userId);
    await this.audit(tx, 'PACKAGE_CREATED', requestId, context, 'Package', pkg.id, { trackingCode: pkg.trackingCode });
    return tx.package.findUniqueOrThrow({ where: { id: pkg.id }, select: this.packageSelect() });
  }

  private async changeRequestState(id: string, from: CustomerRequestStatus, to: CustomerRequestStatus, action: string, context: AuthorizationContext, requestId: string) {
    await this.requestRecord(id, context);
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.customerRequest.updateMany({ where: { id, status: from }, data: { status: to } });
      if (changed.count !== 1) throw this.stateConflict('The request state has changed.');
      await this.audit(tx, action, requestId, context, 'CustomerRequest', id);
    });
    return this.request(id, context);
  }

  private requestScope(context: AuthorizationContext, requestedBranch?: string): Prisma.CustomerRequestWhereInput {
    if (context.workspaceType === 'PERSONAL') return { customerId: context.userId };
    this.requireAnyPermission(context, ['package.read.branch', 'package.read.organization', 'package.update']);
    if (!context.organizationId) throw this.denied();
    if (context.branchId && requestedBranch && context.branchId !== requestedBranch) throw this.denied();
    const branchId = context.branchId ?? requestedBranch;
    return { organizationId: context.organizationId, ...(branchId ? { branchId } : {}) };
  }

  private packageScope(context: AuthorizationContext, requestedBranch?: string): Prisma.PackageWhereInput {
    if (context.workspaceType === 'PERSONAL') {
      this.requirePermission(context, 'package.read.own');
      return { customerId: context.userId };
    }
    if (!context.organizationId) throw this.denied();
    if (context.roles.includes('RIDER') && !context.permissions.has('package.read.branch') && !context.permissions.has('package.read.organization')) {
      return { organizationId: context.organizationId, assignments: { some: { rider: { userId: context.userId }, status: { in: ACTIVE_ASSIGNMENTS } } } };
    }
    this.requireAnyPermission(context, ['package.read.branch', 'package.read.organization']);
    if (context.branchId && requestedBranch && context.branchId !== requestedBranch) throw this.denied();
    const branchId = context.branchId ?? requestedBranch;
    return { organizationId: context.organizationId, ...(branchId ? { OR: [{ originBranchId: branchId }, { destinationBranchId: branchId }] } : {}) };
  }

  private async packageRecord(id: string, context: AuthorizationContext) {
    const scope = this.packageScope(context);
    const row = await this.prisma.package.findFirst({ where: { id, deletedAt: null, ...scope }, select: this.packageSelect() });
    if (!row) throw this.notFound();
    return row;
  }

  private async requestRecord(id: string, context: AuthorizationContext) {
    const row = await this.prisma.customerRequest.findFirst({ where: { id, ...this.requestScope(context) } });
    if (!row) throw this.notFound();
    return row;
  }

  private async requireActiveRiderAssignment(packageId: string, userId: string) {
    const assignment = await this.prisma.packageAssignment.findFirst({
      where: {
        packageId,
        status: PackageAssignmentStatus.ACTIVE,
        rider: { userId, riderStatus: RiderStatus.ASSIGNED, user: { accountStatus: AccountStatus.ACTIVE, employeeProfile: { employeeStatus: EmployeeStatus.ACTIVE } } },
      },
    });
    if (!assignment) throw this.denied();
    return assignment;
  }

  private async completeAssignment(tx: Tx, packageId: string) {
    const assignment = await tx.packageAssignment.findFirst({ where: { packageId, status: { in: ACTIVE_ASSIGNMENTS } } });
    if (!assignment) return;
    await tx.packageAssignment.update({ where: { id: assignment.id }, data: { status: PackageAssignmentStatus.COMPLETED, completedAt: new Date() } });
    await tx.riderProfile.update({ where: { id: assignment.riderId }, data: { riderStatus: RiderStatus.AVAILABLE } });
  }

  private async appendTracking(tx: Tx, packageId: string, type: TrackingEventType, publicMessage: string, actorId?: string, hubId?: string) {
    const last = await tx.trackingEvent.aggregate({ where: { packageId }, _max: { sequence: true } });
    return tx.trackingEvent.create({ data: { packageId, type, visibility: TrackingVisibility.PUBLIC, publicMessage, actorId, hubId, sequence: (last._max.sequence ?? 0) + 1 } });
  }

  private async route(originHubId: string, destinationHubId: string) {
    const hubs = await this.prisma.hub.findMany({
      where: { id: { in: [originHubId, destinationHubId] }, status: HubStatus.ACTIVE, deletedAt: null },
      select: { id: true, organizationId: true, branchId: true },
    });
    const origin = hubs.find((hub) => hub.id === originHubId);
    const destination = originHubId === destinationHubId ? origin : hubs.find((hub) => hub.id === destinationHubId);
    if (!origin || !destination || origin.organizationId !== destination.organizationId) throw this.notFound();
    return { organizationId: origin.organizationId, origin, destination };
  }

  private createAddress(tx: Tx, dto: CustomerRequestCreateDto['pickupAddress'], userId: string | null, organizationId: string | null): Promise<Address> {
    return tx.address.create({ data: { ...dto, userId, organizationId, countryCode: dto.countryCode.toUpperCase() } });
  }

  private requestDetails(dto: Pick<CustomerRequestCreateDto, 'recipientName' | 'recipientPhone' | 'weightKg' | 'serviceLevel' | 'paymentMode' | 'codAmount' | 'originHubId' | 'destinationHubId'>): Prisma.InputJsonObject {
    return {
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone ?? null,
      weightKg: dto.weightKg,
      serviceLevel: dto.serviceLevel.toUpperCase(),
      paymentMode: dto.paymentMode,
      codAmount: dto.codAmount ?? null,
      originHubId: dto.originHubId,
      destinationHubId: dto.destinationHubId,
    };
  }

  private parseDetails(value: Prisma.JsonValue): CustomerRequestCreateDto {
    if (!value || Array.isArray(value) || typeof value !== 'object') throw this.stateConflict('Request details are invalid.');
    return value as unknown as CustomerRequestCreateDto;
  }

  private requestSelect() {
    return {
      id: true, requestCode: true, status: true, packageDetails: true, quotedAmount: true, currency: true,
      resultingPackageId: true, createdAt: true, updatedAt: true,
      pickupAddress: { select: this.addressSelect() }, deliveryAddress: { select: this.addressSelect() },
    } satisfies Prisma.CustomerRequestSelect;
  }

  private packageSelect() {
    return {
      id: true, trackingCode: true, customerId: true, recipientName: true, recipientPhone: true, weightKg: true,
      serviceLevel: true, paymentMode: true, codAmount: true, quotedAmount: true, currency: true, status: true,
      version: true, confirmedAt: true, deliveredAt: true, cancelledAt: true, createdAt: true, updatedAt: true,
      originBranchId: true, destinationBranchId: true, originAddressId: true, destinationAddressId: true,
      originHub: { select: this.hubSelect() }, destinationHub: { select: this.hubSelect() },
      originAddress: { select: this.addressSelect() }, destinationAddress: { select: this.addressSelect() },
      assignments: { where: { status: { in: ACTIVE_ASSIGNMENTS } }, select: this.assignmentSelect(), orderBy: { assignedAt: 'desc' as const }, take: 1 },
    } satisfies Prisma.PackageSelect;
  }

  private riderPackageSelect() {
    return {
      id: true, trackingCode: true, recipientName: true, recipientPhone: true, weightKg: true, serviceLevel: true,
      status: true, version: true, destinationAddress: { select: this.addressSelect() },
      destinationHub: { select: this.hubSelect() }, updatedAt: true,
    } satisfies Prisma.PackageSelect;
  }

  private assignmentSelect() {
    return {
      id: true, status: true, assignedAt: true, acceptedAt: true, completedAt: true, cancelledAt: true,
      branch: { select: { id: true, code: true, name: true } },
      rider: { select: { id: true, riderStatus: true, user: { select: { profile: { select: { displayName: true } }, employeeProfile: { select: { employeeNumber: true } } } } } },
    } satisfies Prisma.PackageAssignmentSelect;
  }

  private trackingSelect(publicOnly: boolean) {
    return {
      ...(publicOnly ? {} : { id: true }), type: true, publicMessage: true, eventAt: true, sequence: true,
      hub: { select: { name: true, code: true } },
    } satisfies Prisma.TrackingEventSelect;
  }

  private hubSelect() {
    return { id: true, branchId: true, code: true, name: true, status: true, capacity: true, timezone: true, addressData: true } satisfies Prisma.HubSelect;
  }

  private addressSelect() {
    return { id: true, type: true, label: true, line1: true, line2: true, locality: true, district: true, postalCode: true, countryCode: true } satisfies Prisma.AddressSelect;
  }

  private safeRequest(row: Record<string, unknown>) {
    const value = row as { quotedAmount: { toString(): string } | null; packageDetails: Prisma.JsonValue } & Record<string, unknown>;
    const details = this.parseDetails(value.packageDetails);
    return { ...value, quotedAmount: value.quotedAmount?.toString() ?? null, packageDetails: { ...details, recipientPhone: this.maskPhone(details.recipientPhone) } };
  }

  private safePackage(row: Record<string, unknown>) {
    const value = row as { recipientPhone: string | null; weightKg: { toString(): string }; quotedAmount: { toString(): string }; codAmount: { toString(): string } | null } & Record<string, unknown>;
    const safe: Record<string, unknown> = { ...value };
    delete safe.customerId;
    return { ...safe, recipientPhone: this.maskPhone(value.recipientPhone), weightKg: value.weightKg.toString(), quotedAmount: value.quotedAmount.toString(), codAmount: value.codAmount?.toString() ?? null };
  }

  private safeHub(row: Record<string, unknown>) {
    const value = row as { addressData: Prisma.JsonValue } & Record<string, unknown>;
    const districtValue = value.addressData && !Array.isArray(value.addressData) && typeof value.addressData === 'object' && 'district' in value.addressData ? value.addressData.district : null;
    const district = typeof districtValue === 'string' ? districtValue : null;
    const safe: Record<string, unknown> = { ...value };
    delete safe.addressData;
    delete safe.branchId;
    return { ...safe, district };
  }

  private safeHubPlace(hub: { name: string; addressData: Prisma.JsonValue } | null) {
    if (!hub) return null;
    const districtValue = hub.addressData && !Array.isArray(hub.addressData) && typeof hub.addressData === 'object' && 'district' in hub.addressData ? hub.addressData.district : null;
    const district = typeof districtValue === 'string' ? districtValue : null;
    return { name: hub.name, district };
  }

  private trackingVisibility(context: AuthorizationContext): TrackingVisibility[] {
    if (context.workspaceType === 'PERSONAL') return [TrackingVisibility.PUBLIC, TrackingVisibility.CUSTOMER];
    if (context.roles.includes('RIDER')) return [TrackingVisibility.PUBLIC, TrackingVisibility.CUSTOMER, TrackingVisibility.WORKFORCE];
    return [TrackingVisibility.PUBLIC, TrackingVisibility.CUSTOMER, TrackingVisibility.WORKFORCE, TrackingVisibility.INTERNAL];
  }

  private publicCode(prefix: 'CSW' | 'REQ') { return `${prefix}-${new Date().getUTCFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`; }
  private maskPhone(value?: string | null) { return value ? `${value.slice(0, 3)}••••${value.slice(-3)}` : null; }
  private maskName(value: string) { const words = value.trim().split(/\s+/); return words.map((word) => word.length < 2 ? '*' : `${word[0]}${'•'.repeat(Math.min(4, word.length - 1))}`).join(' '); }
  private defaultMessage(status: PackageStatus) { return status.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()) + '.'; }
  private statusAudit(status: PackageStatus) { if (status === PackageStatus.DELIVERED) return 'PACKAGE_DELIVERED'; if (status === PackageStatus.DELIVERY_ATTEMPTED) return 'DELIVERY_ATTEMPTED'; if (status === PackageStatus.DELIVERY_FAILED) return 'DELIVERY_FAILED'; if (status === PackageStatus.RETURN_REQUESTED) return 'RETURN_REQUESTED'; if (status === PackageStatus.CANCELLED) return 'PACKAGE_CANCELLED'; return 'PACKAGE_STATUS_CHANGED'; }

  private page<T extends { id: string }, R>(rows: T[], limit: number, map: (row: T) => R) { const hasMore = rows.length > limit; const items = hasMore ? rows.slice(0, limit) : rows; return { items: items.map(map), nextCursor: hasMore ? items.at(-1)?.id ?? null : null }; }
  private requirePersonal(context: AuthorizationContext, permission: string) { if (context.workspaceType !== 'PERSONAL') throw this.denied(); this.requirePermission(context, permission); }
  private requireOrganization(context: AuthorizationContext, permission: string) { if (context.workspaceType !== 'ORGANIZATION' || !context.organizationId) throw this.denied(); this.requirePermission(context, permission); }
  private requirePermission(context: AuthorizationContext, permission: string) { if (!context.permissions.has(permission)) throw this.denied(); }
  private requireAnyPermission(context: AuthorizationContext, permissions: string[]) { if (!permissions.some((permission) => context.permissions.has(permission))) throw this.denied(); }
  private async scopedHub(id: string, context: AuthorizationContext, permission: string) { this.requireOrganization(context, permission); const hub = await this.prisma.hub.findFirst({ where: { id, organizationId: context.organizationId!, ...(context.branchId ? { branchId: context.branchId } : {}), deletedAt: null } }); if (!hub) throw this.notFound(); return hub; }
  private audit(tx: Tx, action: string, requestId: string, context: Pick<AuthorizationContext, 'userId' | 'sessionId' | 'organizationId' | 'branchId'>, resourceType?: string, resourceId?: string, metadata?: Prisma.InputJsonObject) { return tx.auditLog.create({ data: { action, outcome: 'SUCCESS', requestId, actorId: context.userId, sessionId: context.sessionId || undefined, organizationId: context.organizationId, branchId: context.branchId, resourceType, resourceId, metadata } }); }
  private denied() { return new ForbiddenException({ code: 'OPERATION_SCOPE_DENIED', message: 'You are not authorized to access this delivery resource.', details: null }); }
  private notFound() { return new NotFoundException({ code: 'DELIVERY_RESOURCE_NOT_FOUND', message: 'The requested delivery resource was not found.', details: null }); }
  private stateConflict(message: string) { return new ConflictException({ code: 'DELIVERY_STATE_CONFLICT', message, details: null }); }
  private versionConflict() { return new ConflictException({ code: 'DELIVERY_VERSION_CONFLICT', message: 'The delivery record changed. Reload it and try again.', details: null }); }
}
