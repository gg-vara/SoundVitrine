// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The answers of the routes outside the API

import type { Html } from './pages/html';

export const text = (body: string, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/plain;charset=utf-8' } });

export const redirect = (location: string, status = 302) => new Response(null, { status, headers: { location } });

// a page, setting "cookies"
export function page(content: Html | Response, cookies: string[] = []): Response {
  const response =
    content instanceof Response ? content : new Response(content.value, { headers: { 'content-type': 'text/html;charset=utf-8' } });
  for (const cookie of cookies) response.headers.append('set-cookie', cookie);
  return response;
}

export const json = (body: unknown, status = 200, cookies: string[] = []) => {
  const response = Response.json(body, { status });
  for (const cookie of cookies) response.headers.append('set-cookie', cookie);
  return response;
};

export const refused = (error: string, status = 400) => json({ error }, status);
