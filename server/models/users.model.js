import prisma from '../prisma/client.js';

export function getUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export function createUser(userData) {
  return prisma.user.create({
    data: userData,
  });
}
