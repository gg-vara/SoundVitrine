import type { Html } from './html';
import { html } from './html';
import type { PageContext } from './layout';
import { scriptJson } from './layout';

// sends a test shout to a user, and subscribes to the user's shouts
export function mockPage(context: PageContext): Html {
  const base = context.url.pathname.replace(/\/$/, '');
  return html`<!DOCTYPE html>
<html lang="${context.lang}">
    <head>
        <script>
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
        </script>
    </head>
    <body>
        <button id="send-event">Send Event</button>
        <button id="subscribe">Subscribe</button>
    </body>
</html>`;
}
