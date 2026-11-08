// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

import type { PageContext } from './layout';
import { Script, scriptJson } from './layout';

// sends a test shout to a user, and subscribes to the user's shouts
export function mockPage(context: PageContext) {
  const base = context.url.pathname.replace(/\/$/, '');
  const code = `
    const sendEvent = async userToSendEventTo => {
      await fetch(${scriptJson(`${base}/send`)}, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ toUser: userToSendEventTo }),
      });
    };

    const subscribeSSE = userToSubscribeTo => {
      const source = new EventSource("/u/" + userToSubscribeTo + "/shouts");
      source.onmessage = event => console.log("shout", JSON.parse(event.data));
      return source;
    };

    document.onreadystatechange = () => {
      const username = "test";
      document.getElementById("send-event").onclick = () => sendEvent(username);
      document.getElementById("subscribe").onclick = () => subscribeSSE(username);
    };
  `;

  return (
    <html lang={context.lang}>
      <head>
        <Script code={code} />
      </head>
      <body>
        <button type="button" id="send-event">
          Send Event
        </button>
        <button type="button" id="subscribe">
          Subscribe
        </button>
      </body>
    </html>
  );
}
