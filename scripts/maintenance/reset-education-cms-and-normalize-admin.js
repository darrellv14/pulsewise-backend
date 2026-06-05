require('dotenv').config({ override: true });

const { getPool } = require('../seed/seed-dashboard-data');

const TARGET_ADMIN_EMAIL = 'darrell.valentino14@gmail.com';
const TARGET_ADMIN_USERNAME = 'darrellvalentino14';
const TARGET_ADMIN_FIRST_NAME = 'Darrell';
const TARGET_ADMIN_LAST_NAME = 'Valentino';

async function countRows(client, tableName) {
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  return result.rows[0]?.count || 0;
}

async function normalizeAdminUser(client) {
  const result = await client.query(
    `
      UPDATE users
      SET
        username = $2,
        first_name = $3,
        last_name = $4,
        updated_at = NOW()
      WHERE email = $1
      RETURNING user_id, username, email, first_name, last_name
    `,
    [
      TARGET_ADMIN_EMAIL,
      TARGET_ADMIN_USERNAME,
      TARGET_ADMIN_FIRST_NAME,
      TARGET_ADMIN_LAST_NAME,
    ]
  );

  return result.rows[0] || null;
}

async function deleteEducationArticles(client) {
  const before = {
    articles: await countRows(client, 'education_articles'),
    revisions: await countRows(client, 'education_article_revisions'),
    images: await countRows(client, 'education_article_images'),
    articleTags: await countRows(client, 'education_article_tags'),
    likes: await countRows(client, 'education_article_likes'),
    comments: await countRows(client, 'education_article_comments'),
    tags: await countRows(client, 'education_tags'),
  };

  await client.query('DELETE FROM education_articles');

  const orphanTagsResult = await client.query(`
    DELETE FROM education_tags t
    WHERE NOT EXISTS (
      SELECT 1
      FROM education_article_tags eat
      WHERE eat.tag_id = t.tag_id
    )
    RETURNING tag_id
  `);

  const after = {
    articles: await countRows(client, 'education_articles'),
    revisions: await countRows(client, 'education_article_revisions'),
    images: await countRows(client, 'education_article_images'),
    articleTags: await countRows(client, 'education_article_tags'),
    likes: await countRows(client, 'education_article_likes'),
    comments: await countRows(client, 'education_article_comments'),
    tags: await countRows(client, 'education_tags'),
  };

  return {
    before,
    after,
    deletedTags: orphanTagsResult.rowCount,
  };
}

async function run() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cmsCleanup = await deleteEducationArticles(client);
    const normalizedAdmin = await normalizeAdminUser(client);

    await client.query('COMMIT');

    console.log('[maintenance:education] done');
    console.log(
      `[maintenance:education] articles ${cmsCleanup.before.articles} -> ${cmsCleanup.after.articles}`
    );
    console.log(
      `[maintenance:education] revisions ${cmsCleanup.before.revisions} -> ${cmsCleanup.after.revisions}`
    );
    console.log(
      `[maintenance:education] images ${cmsCleanup.before.images} -> ${cmsCleanup.after.images}`
    );
    console.log(
      `[maintenance:education] article_tags ${cmsCleanup.before.articleTags} -> ${cmsCleanup.after.articleTags}`
    );
    console.log(
      `[maintenance:education] likes ${cmsCleanup.before.likes} -> ${cmsCleanup.after.likes}`
    );
    console.log(
      `[maintenance:education] comments ${cmsCleanup.before.comments} -> ${cmsCleanup.after.comments}`
    );
    console.log(
      `[maintenance:education] orphan tags deleted=${cmsCleanup.deletedTags}, remaining tags=${cmsCleanup.after.tags}`
    );

    if (normalizedAdmin) {
      console.log(
        `[maintenance:education] normalized admin ${normalizedAdmin.email} -> ${normalizedAdmin.first_name} ${normalizedAdmin.last_name} (${normalizedAdmin.username})`
      );
    } else {
      console.log(
        `[maintenance:education] admin with email ${TARGET_ADMIN_EMAIL} not found, skipped normalization`
      );
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[maintenance:education] failed', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
