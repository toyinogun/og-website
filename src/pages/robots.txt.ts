// The crawler rules, pre rendered to dist/robots.txt (spec 0007, AC-11).
import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/seo';

/** Serves `robotsTxt` for the configured `site` as plain text. */
export const GET: APIRoute = ({ site, url }) =>
	new Response(robotsTxt(site ?? url), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
