// The button going to the other panel of the library page, notifying when not logged in

const NOTIFICATION =
  '[&.notif]:after:pointer-events-none [&.notif]:after:absolute [&.notif]:after:top-[5%] [&.notif]:after:right-[10%] [&.notif]:after:flex [&.notif]:after:min-h-[1em] [&.notif]:after:min-w-[1em] [&.notif]:after:items-center [&.notif]:after:justify-center [&.notif]:after:rounded-[50%] [&.notif]:after:bg-[red] [&.notif]:after:p-[.1em] [&.notif]:after:text-center [&.notif]:after:text-[.6rem] [&.notif]:after:leading-[0] [&.notif]:after:shadow-[0px_1px_5px_1px_rgba(56,56,56,.2)] [&.notif]:after:content-[attr(data-notif)] [&.notif]:after:[animation-duration:1s] [&.notif]:after:[animation-iteration-count:infinite] [&.notif]:after:[animation-name:bounceIn] [&.notif.notifOut]:after:[animation-fill-mode:forwards]! [&.notif.notifOut]:after:[animation-iteration-count:1]! [&.notif.notifOut]:after:[animation-name:bounceOut]! [&.notif:hover]:after:[animation:none]!';

const CONNECT_BUTTON = `bg-[rgba(255,255,255,.3)] p-[.25rem] [transition:top_.5s] hover:[animation-name:pulse] hover:[animation-duration:1s] hover:[animation-iteration-count:infinite] hover:[animation-fill-mode:forwards] ${NOTIFICATION}`;

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
        'connect-side',
        CONNECT_BUTTON,
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
