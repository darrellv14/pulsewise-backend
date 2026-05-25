const { z } = require('zod');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().uuid().regex(uuidV4Regex, 'Harus UUID v4 yang valid');

const optionalNullableString = (maxLength) =>
  z.union([z.string().trim().max(maxLength), z.literal(''), z.null()]).optional();

const adminUserIdParamSchema = z.object({
  userId: uuidV4Schema,
});

const adminDoctorIdParamSchema = z.object({
  doctorId: uuidV4Schema,
});

const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.union([z.string().trim().max(120), z.literal(''), z.null()]).default(''),
  role: z.enum(['patient', 'doctor', 'admin']).optional(),
  accountStatus: z
    .enum([
      'pending_verification',
      'pending_admin_verification',
      'active',
      'rejected',
      'suspended',
    ])
    .optional(),
});

const adminUserStatusUpdateSchema = z.object({
  accountStatus: z.enum(['active', 'suspended']),
});

const adminDoctorsQuerySchema = z.object({
  status: z
    .enum(['pending_admin_verification', 'active', 'rejected', 'suspended'])
    .optional(),
});

const adminDoctorApproveSchema = z.object({
  verificationNote: optionalNullableString(1000),
});

const adminDoctorRejectSchema = z.object({
  rejectionReason: z.string().trim().min(3).max(1000),
});

const adminDoctorSuspendSchema = z.object({
  verificationNote: optionalNullableString(1000),
});

module.exports = {
  adminUserIdParamSchema,
  adminDoctorIdParamSchema,
  adminUsersQuerySchema,
  adminUserStatusUpdateSchema,
  adminDoctorsQuerySchema,
  adminDoctorApproveSchema,
  adminDoctorRejectSchema,
  adminDoctorSuspendSchema,
};
