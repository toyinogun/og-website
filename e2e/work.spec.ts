import { expect, test } from '@playwright/test';

// Spec 0005 in a real browser, against the production build served from dist/
// (see playwright.config.ts). Work current, axe, target sizes and the width
// sweep for /projects live in the shared lists in design-system.spec.ts.

test.describe('addresses (AC-10)', () => {
	// covers: AC-10
	test('serves /projects and / and answers an unknown path with 404', async ({ request }) => {
		expect((await request.get('/projects')).status()).toBe(200);
		expect((await request.get('/')).status()).toBe(200);
		expect((await request.get('/no-such-page')).status()).toBe(404);
	});
});
