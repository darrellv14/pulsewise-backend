/* eslint-disable no-console */
require('dotenv').config({ override: true });

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://api.darrellvalentino.com';
const AUTHOR_EMAIL = process.env.SMOKE_WORKFLOW_AUTHOR_EMAIL || 'seed.patient2@pulsewise.local';
const AUTHOR_PASSWORD = process.env.SMOKE_WORKFLOW_AUTHOR_PASSWORD || 'dev12345';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || 'darrell.valentino14@gmail.com';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || 'dev12345';

async function requestJson(method, path, token, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    data = { raw: text };
  }

  return {
    status: response.status,
    data,
  };
}

async function login(email, password, label) {
  const response = await requestJson('POST', '/auth/login', null, { email, password });

  if (response.status !== 200 || !response.data?.data?.token) {
    throw new Error(`${label} login gagal (${response.status}) ${response.data?.message || ''}`);
  }

  return {
    token: response.data.data.token,
    user: response.data.data.user,
  };
}

async function deleteArticleIfPossible(articleId, adminToken) {
  if (!articleId) {
    return null;
  }

  const deleted = await requestJson(
    'DELETE',
    `/admin/education/articles/${articleId}`,
    adminToken
  );

  return {
    status: deleted.status,
    message: deleted.data?.message ?? null,
  };
}

async function run() {
  const author = await login(AUTHOR_EMAIL, AUTHOR_PASSWORD, 'author');
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');

  const uniqueId = Date.now();
  const draftPayload = {
    categorySlug: 'nutrisi-pola-makan',
    title: `Prod Smoke Workflow ${uniqueId}`,
    excerpt: 'Artikel uji workflow production yang akan dibersihkan kembali.',
    contentMarkdown: [
      '# Artikel Uji Workflow',
      '',
      'Ini adalah artikel uji workflow production.',
      '',
      '## Checklist',
      '',
      '- draft dibuat',
      '- review diajukan',
      '- admin approve',
      '- cleanup dilakukan',
      '',
      `Token unik: ${uniqueId}`,
    ].join('\n'),
    tags: ['smoke-prod', 'workflow', 'education'],
  };

  let articleId = null;
  let cleanup = null;

  try {
    const draft = await requestJson('POST', '/education/articles', author.token, draftPayload);
    if (draft.status !== 201 || !draft.data?.data?.articleId) {
      throw new Error(`Create draft gagal (${draft.status}) ${draft.data?.message || ''}`);
    }

    articleId = draft.data.data.articleId;

    const myDraftDetail = await requestJson(
      'GET',
      `/education/me/articles/${articleId}`,
      author.token
    );

    const submitReview = await requestJson(
      'POST',
      `/education/articles/${articleId}/submit-review`,
      author.token,
      {}
    );
    if (submitReview.status !== 200) {
      throw new Error(
        `Submit review gagal (${submitReview.status}) ${submitReview.data?.message || ''}`
      );
    }

    const pendingList = await requestJson(
      'GET',
      '/admin/education/articles/pending?page=1&limit=20',
      admin.token
    );

    const approve = await requestJson(
      'POST',
      `/admin/education/articles/${articleId}/approve`,
      admin.token,
      {}
    );
    if (approve.status !== 200) {
      throw new Error(`Approve draft gagal (${approve.status}) ${approve.data?.message || ''}`);
    }

    const slug = approve.data?.data?.slug;
    const liveDetail = slug
      ? await requestJson('GET', `/education/articles/${slug}`, author.token)
      : { status: null, data: null };

    cleanup = await deleteArticleIfPossible(articleId, admin.token);

    const summary = {
      ok: true,
      baseUrl: BASE_URL,
      articleId,
      slug,
      authorUserId: author.user.userId,
      adminUserId: admin.user.userId,
      statuses: {
        draftCreate: draft.status,
        myDraftDetail: myDraftDetail.status,
        submitReview: submitReview.status,
        pendingList: pendingList.status,
        approveDraft: approve.status,
        liveDetail: liveDetail.status,
        cleanupDelete: cleanup?.status ?? null,
      },
      pendingMatchFound: Boolean(
        (pendingList.data?.data?.items || []).find((item) => item.articleId === articleId)
      ),
      cleanup,
    };

    console.log(JSON.stringify(summary, null, 2));

    if (
      draft.status !== 201 ||
      myDraftDetail.status !== 200 ||
      submitReview.status !== 200 ||
      pendingList.status !== 200 ||
      approve.status !== 200 ||
      liveDetail.status !== 200 ||
      cleanup?.status !== 200
    ) {
      process.exitCode = 1;
    }
  } catch (error) {
    cleanup = await deleteArticleIfPossible(articleId, admin.token);
    console.error(
      JSON.stringify(
        {
          ok: false,
          articleId,
          cleanup,
          error: error.message,
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[smoke:prod:education-workflow] failed', error.message);
  process.exitCode = 1;
});
