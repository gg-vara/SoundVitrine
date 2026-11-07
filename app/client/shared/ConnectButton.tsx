// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// The button going to the other panel of the library page, notifying when not logged in

export type Notification = 'shown' | 'leaving' | 'gone';

export function ConnectButton(props: {
  place: string;
  notification: Notification;
  // its exit is over
  left: () => void;
  // on the side of the panel that came into view
  lit?: boolean;
  click: () => void;
}) {
  return (
    <div
      class={[
        'connectButton',
        props.place,
        { notif: props.notification !== 'gone', notifOut: props.notification === 'leaving', anima: props.lit },
      ]}
      data-notif={props.notification === 'gone' ? undefined : '!'}
      onAnimationEnd={event => {
        if (props.notification === 'leaving' && event.pseudoElement === '::after') props.left();
      }}
    >
      {/* biome-ignore lint/a11y/noLabelWithoutControl: as the other buttons of the header, whose inputs show their state */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: as above */}
      <label class="clickable" title={i18n.e_log_home} onClick={props.click}>
        <i class="fas fa-sign-in-alt" />
      </label>
    </div>
  );
}
