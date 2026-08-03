import bcrypt from 'bcryptjs';

import { prisma } from '../src/config/prisma';

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: 'corehr' },
    update: {},
    create: { name: 'CoreHR', slug: 'corehr' },
  });

  const engineering = await prisma.department.upsert({
    where: { id: 'dept-engineering' },
    update: {},
    create: { id: 'dept-engineering', name: 'Engineering', organizationId: organization.id },
  });

  const peopleOps = await prisma.department.upsert({
    where: { id: 'dept-people-ops' },
    update: {},
    create: { id: 'dept-people-ops', name: 'People Ops', organizationId: organization.id },
  });

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@corehr.dev' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@corehr.dev',
      passwordHash,
      role: 'SUPER_ADMIN',
      organizationId: organization.id,
    },
  });

  await prisma.employee.upsert({
    where: { email: adminUser.email },
    update: {},
    create: {
      fullName: adminUser.name,
      email: adminUser.email,
      jobTitle: 'System Administrator',
      departmentId: peopleOps.id,
      organizationId: organization.id,
      userId: adminUser.id,
      status: 'ACTIVE',
    },
  });

  const managerPasswordHash = await bcrypt.hash('Manager@123', 10);
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@corehr.dev' },
    update: {},
    create: {
      name: 'Daniel Ross',
      email: 'manager@corehr.dev',
      passwordHash: managerPasswordHash,
      role: 'MANAGER',
      organizationId: organization.id,
    },
  });

  const managerEmployee = await prisma.employee.upsert({
    where: { email: managerUser.email },
    update: {},
    create: {
      fullName: managerUser.name,
      email: managerUser.email,
      jobTitle: 'Engineering Manager',
      departmentId: engineering.id,
      organizationId: organization.id,
      userId: managerUser.id,
      status: 'ACTIVE',
    },
  });

  const employeePasswordHash = await bcrypt.hash('Employee@123', 10);
  const employeeUser = await prisma.user.upsert({
    where: { email: 'alicia.morgan@corehr.dev' },
    update: {},
    create: {
      name: 'Alicia Morgan',
      email: 'alicia.morgan@corehr.dev',
      passwordHash: employeePasswordHash,
      role: 'EMPLOYEE',
      organizationId: organization.id,
    },
  });

  const aliciaEmployee = await prisma.employee.upsert({
    where: { email: employeeUser.email },
    update: {},
    create: {
      fullName: employeeUser.name,
      email: employeeUser.email,
      jobTitle: 'Senior Frontend Engineer',
      departmentId: engineering.id,
      organizationId: organization.id,
      userId: employeeUser.id,
      status: 'ACTIVE',
    },
  });

  await prisma.employee.upsert({
    where: { email: 'jatin.shah@corehr.dev' },
    update: {},
    create: {
      fullName: 'Jatin Shah',
      email: 'jatin.shah@corehr.dev',
      jobTitle: 'Accounting Lead',
      departmentId: peopleOps.id,
      organizationId: organization.id,
      status: 'PROBATION',
    },
  });

  const existingLeaveRequest = await prisma.leaveRequest.findFirst({
    where: { employeeId: aliciaEmployee.id, status: 'PENDING' },
  });

  if (!existingLeaveRequest) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: aliciaEmployee.id,
        leaveType: 'Annual Leave',
        startDate: new Date('2026-09-10'),
        endDate: new Date('2026-09-12'),
        reason: 'Family trip',
        status: 'PENDING',
      },
    });
  }

  const existingApprovedLeave = await prisma.leaveRequest.findFirst({
    where: { employeeId: managerEmployee.id, status: 'APPROVED' },
  });

  if (!existingApprovedLeave) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: managerEmployee.id,
        leaveType: 'Sick Leave',
        startDate: new Date('2026-08-22'),
        endDate: new Date('2026-08-24'),
        reason: 'Recovering from flu',
        status: 'APPROVED',
        approvedBy: adminUser.id,
      },
    });
  }

  const existingNotification = await prisma.notification.findFirst({
    where: { userId: employeeUser.id },
  });

  if (!existingNotification) {
    await prisma.notification.create({
      data: {
        userId: employeeUser.id,
        title: 'Welcome to CoreHR',
        message: 'Your employee profile has been set up. Explore the dashboard to get started.',
        type: 'INFO',
      },
    });
  }

  console.log('Seed complete. Login with admin@corehr.dev / Admin@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
