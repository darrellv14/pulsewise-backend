const { pool } = require('../config/database');

async function listPatientProfiles({ limit, offset, sortBy, order }) {
  const sortable = new Set([
    'created_at',
    'date_of_birth',
    'sex',
    'body_height_cm',
    'is_smoking',
    'is_electric_smoking',
    'blood_type',
  ]);
  const sortColumn = sortable.has(sortBy) ? sortBy : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const query = `
    SELECT
      p.patient_id,
      p.date_of_birth,
      p.sex,
      p.body_height_cm,
      p.is_smoking,
      p.is_electric_smoking,
      p.blood_type,
      p.created_at
      ,u.first_name,
      u.last_name,
      u.email,
      u.address
    FROM patient_profiles p
    JOIN users u ON u.user_id = p.patient_id
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $1 OFFSET $2
  `;

  const totalQuery = 'SELECT COUNT(*)::INT AS total FROM patient_profiles';

  const [itemsResult, totalResult] = await Promise.all([
    pool.query(query, [limit, offset]),
    pool.query(totalQuery),
  ]);

  return {
    items: itemsResult.rows,
    totalItems: totalResult.rows[0]?.total || 0,
  };
}

async function getPatientProfileById(patientId) {
  const query = `
    SELECT
      p.patient_id,
      p.date_of_birth,
      p.sex,
      p.body_height_cm,
      p.is_smoking,
      p.is_electric_smoking,
      p.blood_type,
      p.created_at,
      u.first_name,
      u.last_name,
      u.email,
      u.address
    FROM patient_profiles p
    JOIN users u ON u.user_id = p.patient_id
    WHERE p.patient_id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [patientId]);
  return result.rows[0] || null;
}

async function upsertPatientProfile({
  patientId,
  dateOfBirth,
  sex,
  bodyHeightCm,
  isSmoking,
  isElectricSmoking,
  bloodType,
  address,
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO patient_profiles (patient_id) VALUES ($1) ON CONFLICT (patient_id) DO NOTHING',
      [patientId]
    );

    const profileUpdates = [];
    const profileValues = [];

    if (dateOfBirth !== undefined) {
      profileUpdates.push(`date_of_birth = $${profileValues.length + 1}`);
      profileValues.push(dateOfBirth);
    }

    if (sex !== undefined) {
      profileUpdates.push(`sex = $${profileValues.length + 1}`);
      profileValues.push(sex);
    }

    if (bodyHeightCm !== undefined) {
      profileUpdates.push(`body_height_cm = $${profileValues.length + 1}`);
      profileValues.push(bodyHeightCm);
    }

    if (isSmoking !== undefined) {
      profileUpdates.push(`is_smoking = $${profileValues.length + 1}`);
      profileValues.push(isSmoking);
    }

    if (isElectricSmoking !== undefined) {
      profileUpdates.push(`is_electric_smoking = $${profileValues.length + 1}`);
      profileValues.push(isElectricSmoking);
    }

    if (bloodType !== undefined) {
      profileUpdates.push(`blood_type = $${profileValues.length + 1}`);
      profileValues.push(bloodType);
    }

    if (profileUpdates.length > 0) {
      profileValues.push(patientId);
      await client.query(
        `
          UPDATE patient_profiles
          SET ${profileUpdates.join(', ')}
          WHERE patient_id = $${profileValues.length}
        `,
        profileValues
      );
    }

    if (address !== undefined) {
      await client.query(
        `
          UPDATE users
          SET address = $1,
              updated_at = NOW()
          WHERE user_id = $2
        `,
        [address, patientId]
      );
    }

    const result = await client.query(
      `
        SELECT
          p.patient_id,
          p.date_of_birth,
          p.sex,
          p.body_height_cm,
          p.is_smoking,
          p.is_electric_smoking,
          p.blood_type,
          p.created_at,
          u.first_name,
          u.last_name,
          u.email,
          u.address
        FROM patient_profiles p
        JOIN users u ON u.user_id = p.patient_id
        WHERE p.patient_id = $1
        LIMIT 1
      `,
      [patientId]
    );

    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getDoctorProfileById(doctorId) {
  const query = `
    SELECT
      d.doctor_id,
      d.specialization,
      d.license_no,
      d.hospital_name,
      d.created_at,
      u.first_name,
      u.last_name,
      u.email
    FROM doctor_profiles d
    JOIN users u ON u.user_id = d.doctor_id
    WHERE d.doctor_id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [doctorId]);
  return result.rows[0] || null;
}

async function upsertDoctorProfile({ doctorId, specialization, licenseNo, hospitalName }) {
  const query = `
    INSERT INTO doctor_profiles (
      doctor_id,
      specialization,
      license_no,
      hospital_name
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (doctor_id)
    DO UPDATE SET
      specialization = EXCLUDED.specialization,
      license_no = EXCLUDED.license_no,
      hospital_name = EXCLUDED.hospital_name
    RETURNING doctor_id, specialization, license_no, hospital_name, created_at
  `;

  const result = await pool.query(query, [doctorId, specialization, licenseNo, hospitalName]);
  return result.rows[0] || null;
}

module.exports = {
  listPatientProfiles,
  getPatientProfileById,
  upsertPatientProfile,
  getDoctorProfileById,
  upsertDoctorProfile,
};
