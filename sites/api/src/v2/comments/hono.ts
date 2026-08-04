import { Hono } from 'hono'
import type { HonoEnv } from '../../apiTypes'

export function reviewPackageApi() {
    const app = new Hono<HonoEnv>();

    // GET: /v2/reviews - Gets all review packages
    app.get('/v2/reviews', async () => {

    });

    // GET: /v2/reviews/:id/comments - Gets all comments for a specific review package
    app.get('/v2/reviews/:id/comments', async () => {

    });
}