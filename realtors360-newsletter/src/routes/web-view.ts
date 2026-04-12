/**
 * Web view route — serves email HTML in the browser.
 *
 * GET /emails/:id — looks up newsletter by ID, returns the stored
 * html_body so recipients can "View in browser" when their email
 * client renders poorly.
 *
 * No auth required — the ID is a UUID which is unguessable.
 * No tracking — this is a convenience feature, not a pixel.
 */

import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

export const webViewRouter: Router = Router();

webViewRouter.get('/emails/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const log = logger.child({ path: '/emails', newsletterId: id });

  try {
    const { data, error } = await supabase
      .from('newsletters')
      .select('html_body, subject')
      .eq('id', String(id))
      .maybeSingle();

    if (error) {
      log.warn({ err: error }, 'web-view: query failed');
      return res.status(500).send('Something went wrong.');
    }

    if (!data || !data.html_body) {
      return res.status(404).send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>Not Found</title></head>
        <body style="font-family:-apple-system,sans-serif;text-align:center;padding:80px 20px;color:#1d1d1f;">
          <h1 style="font-size:24px;font-weight:600;">Email not found</h1>
          <p style="color:#6e6e73;">This email may have expired or the link is invalid.</p>
        </body></html>
      `);
    }

    // Return the stored HTML directly
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(data.html_body);
  } catch (err) {
    log.error({ err }, 'web-view: handler error');
    return res.status(500).send('Something went wrong.');
  }
});
