import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'node_modules/bcryptjs';
import {
  EmploymentStatus,
  EmploymentType,
  Gender,
  PrismaClient,
  Role,
} from 'src/prisma/generated/prisma/client';

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: pool });
async function main() {
  console.log('Starting database seeding...');

  const departmentData = await prisma.department.upsert({
    create: {
      id: 'dept-engineering-id',
      name: 'Engneering',
      description: 'Software development and IT infrastructure',
    },
    update: {},
    where: {
      id: 'dept-engineering-id',
    },
  });
  const hrDept = await prisma.department.upsert({
    where: { id: 'dept-hr-id' },
    update: {},
    create: {
      id: 'dept-hr-id',
      name: 'Human Resources',
      description: 'Employee relations and recruitment',
    },
  });
  const softwareDeveloper = await prisma.designation.upsert({
    where: { id: 'desig-dev-id' },
    update: {},
    create: {
      id: 'desig-dev-id',
      name: 'Software Developer',
      description: 'Develops and maintains software applications',
    },
  });

  const hrManagerDesig = await prisma.designation.upsert({
    where: { id: 'desig-hrmanager-id' },
    update: {},
    create: {
      id: 'desig-hrmanager-id',
      name: 'HR Manager',
      description: 'Oversees human resources operations',
    },
  });

  // 3. Create Leave Types
  const annualLeave = await prisma.leaveType.upsert({
    where: { id: 'leave-annual-id' },
    update: {},
    create: {
      id: 'leave-annual-id',
      name: 'Annual Leave',
      maxDayPerYear: 12,
      isPaid: true,
      isCarryForward: true,
      maxCarryForward: 5,
    },
  });

  // 4. Create Users (Accounts)
  const saltRounds = 10;
  const defaultPassword = await bcrypt.hash('Password123!', saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hrm.com' },
    update: {},
    create: {
      email: 'admin@hrm.com',
      passwordHash: defaultPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const devUser = await prisma.user.upsert({
    where: { email: 'dev@hrm.com' },
    update: {},
    create: {
      email: 'dev@hrm.com',
      passwordHash: defaultPassword,
      role: Role.EMPLOYEE,
      isActive: true,
    },
  });

  // 5. Create Employees and Link to Users, Departments, and Designations
  const hrManagerEmployee = await prisma.employee.upsert({
    where: { email: 'admin@hrm.com' },
    update: {},
    create: {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'admin@hrm.com',
      gender: Gender.FEMALE,
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      joiningDate: new Date('2024-01-15'),
      departmentId: hrDept.id,
      designationId: hrManagerDesig.id,
      userId: adminUser.id,
    },
  });

  const developerEmployee = await prisma.employee.upsert({
    where: { email: 'dev@hrm.com' },
    update: {},
    create: {
      firstName: 'Bob',
      lastName: 'Nguyen',
      email: 'dev@hrm.com',
      gender: Gender.MALE,
      employmentType: EmploymentType.FULL_TIME,
      employmentStatus: EmploymentStatus.ACTIVE,
      joiningDate: new Date('2025-06-01'),
      departmentId: departmentData.id,
      designationId: softwareDeveloper.id,
      userId: devUser.id,
      managerId: hrManagerEmployee.id, // Linking Alice as Bob's manager as an example
    },
  });

  // 6. Allocate Leaves for the Developer
  await prisma.leaveAllocation.upsert({
    where: { id: 'alloc-dev-annual-id' },
    update: {},
    create: {
      id: 'alloc-dev-annual-id',
      leaveTypeId: annualLeave.id,
      employeeId: developerEmployee.id,
      allocatedDays: 12,
      usedDays: 0,
      carryForward: 0,
    },
  });
  console.log('Seeding finished successfully');
}
main()
  .catch((err) => {
    console.error('Seeding failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
