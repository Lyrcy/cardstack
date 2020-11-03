import { module, test } from 'qunit';
import { click, visit, currentURL, find } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import Fixtures from '../helpers/fixtures';
import {
  waitForCardLoad,
  encodeColons,
  waitForTestsToEnd,
  CARDS_URL,
  DEFAULT_ORG,
  DEFAULT_COLLECTION,
} from '../helpers/card-ui-helpers';
import { login } from '../helpers/login';
import { percySnapshot } from 'ember-percy';
import { cardDocument } from '@cardstack/hub';
import { embeddedCssFile } from '@cardstack/cardhost/utils/scaffolding';

const csRealm = `http://localhost:3000/api/realms/default`;
const template = cardDocument()
  .withAttributes({
    csRealm,
    csId: 'collection-template',
    csTitle: 'Template',
    csCreated: '2020-01-01T14:00:00Z',
    csFieldSets: {
      embedded: ['name'],
      isolated: ['name', 'email'],
    },
    csFeatures: { 'embedded-css': embeddedCssFile },
    csFiles: {
      [embeddedCssFile]: 'template css',
    },
    name: 'Sample User',
    email: 'user@nowhere.dog',
  })
  .withField('name', 'string-field')
  .withField('email', 'string-field');
const card1 = cardDocument()
  .withAttributes({
    csRealm,
    csId: 'collection-hassan',
    csTitle: 'Master Recording',
    csCreated: '2020-01-01T10:00:00Z',
    name: 'Hassan Abdel-Rahman',
    email: 'hassan@nowhere.dog',
  })
  .adoptingFrom(template);
const card2 = cardDocument()
  .withAttributes({
    csRealm,
    csId: 'collection-van-gogh',
    csTitle: 'Master Recording',
    csCreated: '2020-01-01T09:00:00Z',
    name: 'Van Gogh',
    email: 'vangogh@nowhere.dog',
  })
  .adoptingFrom(template);

const scenario = new Fixtures({
  create: [template, card1, card2],
});

async function waitForCollectionLoad() {
  await Promise.all([card1, card2].map(card => waitForCardLoad(card.canonicalURL)));
}

module('Acceptance | collection', function(hooks) {
  setupApplicationTest(hooks);
  scenario.setupModule(hooks);

  hooks.beforeEach(async function() {
    await login();
  });
  hooks.afterEach(async function() {
    await waitForTestsToEnd();
  });

  test(`viewing collection`, async function(assert) {
    await visit('/');
    assert.equal(currentURL(), `${CARDS_URL}/collection/${DEFAULT_COLLECTION}`);

    await visit(`${CARDS_URL}`);
    assert.equal(currentURL(), `${CARDS_URL}/collection/${DEFAULT_COLLECTION}`);

    await visit(`${CARDS_URL}/collection/${DEFAULT_COLLECTION}`);
    await waitForCollectionLoad();
    assert.equal(currentURL(), `${CARDS_URL}/collection/${DEFAULT_COLLECTION}`);

    assert.dom('[data-test-org-header]').exists();
    assert.dom('[data-test-cardhost-left-edge]').exists();
    assert.dom(`[data-test-org-switcher="${DEFAULT_ORG}"]`).exists();
    assert.dom('[data-test-isolated-collection]').exists();
    assert.dom('[data-test-isolated-collection-card]').exists({ count: 2 });

    await percySnapshot(assert);
  });

  test('card embedded css is rendered for the cards in the collection', async function(assert) {
    await visit(`${CARDS_URL}`);
    await waitForCollectionLoad();

    assert.ok(
      find(`[data-test-css-format="embedded"]`).innerText.includes('template css'),
      'embedded card style is correct'
    );
  });

  test(`isolating a card`, async function(assert) {
    await visit(`${CARDS_URL}`);
    await waitForCollectionLoad();

    await click(`[data-test-card-renderer="${card2.canonicalURL}"] a`);
    await waitForCardLoad();
    assert.equal(encodeColons(currentURL()), `${CARDS_URL}/${encodeURIComponent(card2.canonicalURL)}`);
    assert.dom(`[data-test-card-renderer-isolated="${card2.canonicalURL}"]`).exists();

    await percySnapshot(assert);
  });

  test(`can switch collection view using the left edge`, async function(assert) {
    const org1 = 'bunny-records';
    const title1 = 'Bunny Records';
    const collection1 = 'master-recordings';
    const collectionTitle1 = 'Master recordings';
    const org2 = 'warner-chappell-music';
    const title2 = 'Warner Chappell Music';
    const collection2 = 'musical-works';
    const collectionTitle2 = 'Musical works';

    await visit(`/cards/${org1}/collection/${collection1}`);
    await waitForCollectionLoad();
    assert.equal(currentURL(), `/cards/${org1}/collection/${collection1}`);

    assert.dom(`[data-test-org-switcher=${org1}]`).exists();
    assert.dom(`[data-test-org-switcher=${org1}]`).hasClass('active');
    assert.dom('[data-test-org-header] h1').hasText(title1);
    assert.dom(`[data-test-org-header-link=${collection1}]`).exists();
    assert.dom(`[data-test-org-header-link=${collection1}]`).hasClass('active');
    assert
      .dom(`[data-test-org-header-link=${collection1}]`)
      .hasAttribute('href', `/cards/${org1}/collection/${collection1}`);
    assert.dom('[data-test-isolated-collection] h2').hasText(collectionTitle1);
    assert.dom('[data-test-isolated-collection-count]').hasText('2');

    assert.dom(`[data-test-org-switcher=${org2}]`).exists();
    assert.dom(`[data-test-org-switcher=${org2}]`).doesNotHaveClass('active');
    assert.dom(`[data-test-org-header-link=${collection2}]`).doesNotExist();

    await click(`[data-test-org-switcher=${org2}]`);
    assert.equal(currentURL(), `/cards/${org2}/collection/${collection2}`);

    assert.dom(`[data-test-org-switcher=${org2}]`).hasClass('active');
    assert.dom('[data-test-org-header] h1').hasText(title2);
    assert.dom(`[data-test-org-header-link=${collection2}]`).exists();
    assert.dom(`[data-test-org-header-link=${collection2}]`).hasClass('active');
    assert
      .dom(`[data-test-org-header-link=${collection2}]`)
      .hasAttribute('href', `/cards/${org2}/collection/${collection2}`);
    assert.dom('[data-test-isolated-collection] h2').hasText(collectionTitle2);
    assert.dom('[data-test-isolated-collection-count]').hasText('0');

    assert.dom(`[data-test-org-switcher=${org1}]`).exists();
    assert.dom(`[data-test-org-switcher=${org1}]`).doesNotHaveClass('active');
    assert.dom(`[data-test-org-header-link=${collection1}]`).doesNotExist();

    await percySnapshot(assert);

    await click(`[data-test-org-switcher="${org1}"]`);
    assert.equal(currentURL(), `/cards/${org1}/collection/${collection1}`);
    assert.dom('[data-test-org-header] h1').hasText(title1);
    assert.dom('[data-test-isolated-collection] h2').hasText(collectionTitle1);
  });
});
