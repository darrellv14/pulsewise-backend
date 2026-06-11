/* eslint-disable no-console */
require('dotenv').config({ override: true });

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://api.darrellvalentino.com';
const PATIENT_EMAIL = process.env.SMOKE_PATIENT_EMAIL || 'seed.patient2@pulsewise.local';
const PATIENT_PASSWORD = process.env.SMOKE_PASSWORD || 'dev12345';
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

async function run() {
  const patient = await login(PATIENT_EMAIL, PATIENT_PASSWORD, 'patient');
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');

  const categories = await requestJson('GET', '/education/categories', patient.token);
  const tags = await requestJson('GET', '/education/tags', patient.token);
  const feed = await requestJson('GET', '/education/articles?sort=latest&limit=5', patient.token);
  const feedItems = feed.data?.data?.items || [];
  let selectedArticle = null;
  let detail = null;
  let comments = null;

  for (const item of feedItems) {
    if (!item?.slug || !item?.articleId) {
      continue;
    }

    const candidateDetail = await requestJson(
      'GET',
      `/education/articles/${item.slug}`,
      patient.token
    );

    if (candidateDetail.status === 200) {
      selectedArticle = item;
      detail = candidateDetail;
      comments = await requestJson(
        'GET',
        `/education/articles/${item.articleId}/comments?limit=5`,
        patient.token
      );
      break;
    }
  }

  const myArticles = await requestJson(
    'GET',
    '/education/me/articles?page=1&limit=5&status=published',
    patient.token
  );
  const adminArticles = await requestJson(
    'GET',
    '/admin/education/articles?page=1&limit=5',
    admin.token
  );
  const adminPending = await requestJson(
    'GET',
    '/admin/education/articles/pending?page=1&limit=5',
    admin.token
  );
  const adminRevisions = await requestJson(
    'GET',
    '/admin/education/articles/revisions/pending?page=1&limit=5',
    admin.token
  );

  const deletionRequest = await requestJson(
    'POST',
    '/auth/account-deletion/request',
    patient.token,
    {
      confirmationText: 'HAPUS AKUN',
      reauthMethod: 'otp',
    }
  );

  const summary = {
    ok: true,
    baseUrl: BASE_URL,
    patientUserId: patient.user.userId,
    adminUserId: admin.user.userId,
    education: {
      categoriesStatus: categories.status,
      categoriesCount: categories.data?.data?.length ?? 0,
      tagsStatus: tags.status,
      tagsCount: tags.data?.data?.length ?? 0,
      feedStatus: feed.status,
      feedCount: feedItems.length,
      firstArticle: selectedArticle
        ? {
            articleId: selectedArticle.articleId,
            slug: selectedArticle.slug,
            title: selectedArticle.title,
          }
        : null,
      detailStatus: detail?.status ?? null,
      commentsStatus: comments?.status ?? null,
      commentCount: comments?.data?.data?.items?.length ?? null,
      myArticlesStatus: myArticles.status,
      myArticlesCount: myArticles.data?.data?.items?.length ?? 0,
      adminArticlesStatus: adminArticles.status,
      adminArticlesCount: adminArticles.data?.data?.items?.length ?? 0,
      adminPendingStatus: adminPending.status,
      adminPendingCount: adminPending.data?.data?.items?.length ?? 0,
      adminRevisionsStatus: adminRevisions.status,
      adminRevisionsCount: adminRevisions.data?.data?.items?.length ?? 0,
    },
    deleteAccount: {
      requestStatus: deletionRequest.status,
      nextStep: deletionRequest.data?.data?.nextStep ?? null,
      reauthMethod: deletionRequest.data?.data?.reauthMethod ?? null,
      availableReauthMethods: deletionRequest.data?.data?.availableReauthMethods ?? [],
      delivery: deletionRequest.data?.data?.delivery ?? null,
      message: deletionRequest.data?.message ?? null,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (
    categories.status !== 200 ||
    tags.status !== 200 ||
    feed.status !== 200 ||
    !selectedArticle ||
    detail?.status !== 200 ||
    comments?.status !== 200 ||
    myArticles.status !== 200 ||
    adminArticles.status !== 200 ||
    adminPending.status !== 200 ||
    adminRevisions.status !== 200 ||
    deletionRequest.status !== 200 ||
    deletionRequest.data?.data?.nextStep !== 'CONFIRM_ACCOUNT_DELETION'
  ) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[smoke:prod:education-delete-account] failed', error.message);
  process.exitCode = 1;
});
