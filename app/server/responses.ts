// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The answers of the routes outside the API

import type { JSX } from 'hono/jsx/jsx-runtime';

export const text = (body: string, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/plain;charset=utf-8' } });

export const redirect = (location: string, status = 302) => new Response(null, { status, headers: { location } });

// a page, setting "cookies" : a whole document, in hono/jsx, which cannot write its doctype
export function page(content: JSX.Element | Response, cookies: string[] = []): Response {
  // the pages have no asynchronous component : what they render is there at once
  if (content instanceof Promise) throw new Error('A page rendered asynchronously');
  const response =
    content instanceof Response
      ? content
      : new Response(`<!DOCTYPE html>${content}`, { headers: { 'content-type': 'text/html;charset=utf-8' } });
  for (const cookie of cookies) response.headers.append('set-cookie', cookie);
  return response;
}

export const json = (body: unknown, status = 200, cookies: string[] = []) => {
  const response = Response.json(body, { status });
  for (const cookie of cookies) response.headers.append('set-cookie', cookie);
  return response;
};

export const refused = (error: string, status = 400) => json({ error }, status);
