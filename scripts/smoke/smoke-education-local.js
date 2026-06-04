/* eslint-disable no-console */
require('dotenv').config({ override: true });

const request = require('supertest');
const app = require('../../src/app');

async function login(email, password) {
  const response = await request(app).post('/auth/login').send({ email, password });
  if (response.status !== 200 || !response.body?.data?.token) {
    throw new Error(`Login gagal untuk ${email}: ${response.status} ${response.text}`);
  }

  return {
    token: response.body.data.token,
    user: response.body.data.user,
  };
}

async function run() {
  const patient = await login('dev@pulsewise.local', 'dev12345');
  const admin = await login('darrell.valentino14@gmail.com', 'dev12345');

  const draftPayload = {
    categorySlug: 'nutrisi-pola-makan',
    title: `Smoke Education ${Date.now()}`,
    excerpt: 'Smoke test artikel edukasi.',
    contentMarkdown:
      '# Smoke Test\n\nIni adalah artikel smoke test untuk workflow edukasi.\n\n- draft\n- review\n- publish\n',
    tags: ['smoke', 'edukasi'],
  };

  const draft = await request(app)
    .post('/education/articles')
    .set('Authorization', `Bearer ${patient.token}`)
    .send(draftPayload);

  if (draft.status !== 201) {
    throw new Error(`Create draft gagal: ${draft.status} ${draft.text}`);
  }

  const articleId = draft.body.data.articleId;

  const submitted = await request(app)
    .post(`/education/articles/${articleId}/submit-review`)
    .set('Authorization', `Bearer ${patient.token}`)
    .send({});

  if (submitted.status !== 200) {
    throw new Error(`Submit review gagal: ${submitted.status} ${submitted.text}`);
  }

  const approved = await request(app)
    .post(`/admin/education/articles/${articleId}/approve`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({});

  if (approved.status !== 200) {
    throw new Error(`Approve draft gagal: ${approved.status} ${approved.text}`);
  }

  const slug = approved.body.data.slug;

  const feed = await request(app)
    .get('/education/articles?limit=10')
    .set('Authorization', `Bearer ${patient.token}`);

  if (feed.status !== 200) {
    throw new Error(`Feed gagal: ${feed.status} ${feed.text}`);
  }

  const detail = await request(app)
    .get(`/education/articles/${slug}`)
    .set('Authorization', `Bearer ${patient.token}`);

  if (detail.status !== 200) {
    throw new Error(`Detail gagal: ${detail.status} ${detail.text}`);
  }

  const liked = await request(app)
    .post(`/education/articles/${articleId}/likes`)
    .set('Authorization', `Bearer ${patient.token}`)
    .send({});

  if (liked.status !== 200) {
    throw new Error(`Like gagal: ${liked.status} ${liked.text}`);
  }

  const comment = await request(app)
    .post(`/education/articles/${articleId}/comments`)
    .set('Authorization', `Bearer ${patient.token}`)
    .send({ content: 'Komentar smoke test.' });

  if (comment.status !== 201) {
    throw new Error(`Comment gagal: ${comment.status} ${comment.text}`);
  }

  const revised = await request(app)
    .put(`/education/articles/${articleId}`)
    .set('Authorization', `Bearer ${patient.token}`)
    .send({
      ...draftPayload,
      title: `${draftPayload.title} Revisi`,
      contentMarkdown:
        '# Smoke Test Revisi\n\nVersi revisi artikel published untuk queue admin.\n\n```js\nconsole.log("revisi")\n```\n',
    });

  if (revised.status !== 200) {
    throw new Error(`Create revision gagal: ${revised.status} ${revised.text}`);
  }

  const revisions = await request(app)
    .get('/admin/education/articles/revisions/pending?page=1&limit=20')
    .set('Authorization', `Bearer ${admin.token}`);

  if (revisions.status !== 200) {
    throw new Error(`List revisions gagal: ${revisions.status} ${revisions.text}`);
  }

  const revision = (revisions.body.data.items || []).find((item) => item.article?.articleId === articleId);
  if (!revision?.revisionId) {
    throw new Error('Revision pending tidak ditemukan untuk artikel smoke');
  }

  const revisionApproved = await request(app)
    .post(`/admin/education/revisions/${revision.revisionId}/approve`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({});

  if (revisionApproved.status !== 200) {
    throw new Error(`Approve revision gagal: ${revisionApproved.status} ${revisionApproved.text}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        articleId,
        slug,
        commentId: comment.body.data.commentId,
        revisionId: revision.revisionId,
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error('[smoke:education:local] failed', error);
  process.exit(1);
});
