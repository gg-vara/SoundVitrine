// Logging in, creating an account, and managing it : on a page of its own, or in the panel of the library page
import { createSignal, Show } from 'solid-js';
import { filled } from '../library/texts';
import { Editors } from './Editors';
import { ACCOUNT_CREATION, ACCOUNT_MANAGEMENT, LOGIN_RACK } from './styles';

interface LengthRule {
  min: number;
  max: number;
}

// what the server tells : GET /account/me
export interface Me {
  username: string | null;
  profilePicture: string | null;
  colors: string[];
  rules: { username: LengthRule; password: LengthRule };
  companionApp: { name: string; url: string };
}

export async function fetchMe(): Promise<Me | null> {
  try {
    const response = await fetch('/account/me');
    if (!response.ok) throw new Error(`/account/me : ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('The account could not be loaded', error);
    return null;
  }
}

// why it is refused, if so
async function post(url: string, fields: Record<string, string>): Promise<string | null> {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(fields) });
  if (response.ok) return null;
  const { error } = (await response.json().catch(() => ({}))) as { error?: string };
  return error ?? `${url} : ${response.status}`;
}

function Popup(props: { message: string | null; hidden: boolean; hide: () => void }) {
  return (
    <Show when={props.message}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a click anywhere dismisses it, and it is no more than a message */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: as above */}
      <div class={['popup error', { hide: props.hidden }]} onClick={props.hide}>
        <div class="popupMessage">{props.message}</div>
      </div>
    </Show>
  );
}

function Field(props: { label: string | undefined; type: string; name: string; autocomplete?: string; rule?: LengthRule }) {
  return (
    <div class="field" {...{ placeholder: props.label }}>
      <input
        class="textInput"
        required
        type={props.type}
        name={props.name}
        autocomplete={props.autocomplete}
        pattern={props.rule && `.{${props.rule.min},${props.rule.max}}`}
        placeholder={props.rule && filled(i18n.e_log_rule, props.rule.min, props.rule.max)}
      />
    </div>
  );
}

// a form asking something to the server, telling what it refuses
function useSubmit(url: string, accepted: () => Promise<void>) {
  const [refusal, setRefusal] = createSignal<string | null>(null);
  const [hidden, setHidden] = createSignal(false);

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement)) as Record<string, string>;
    try {
      const refused = await post(url, fields);
      if (refused === null) return await accepted();
      setRefusal(refused);
      setHidden(false);
    } catch (error) {
      console.error(`${url} could not be reached`, error);
    }
  };

  return { submit, popup: () => <Popup message={refusal()} hidden={hidden()} hide={() => setHidden(true)} /> };
}

function Login(props: { accepted: () => Promise<void>; toCreation: () => void }) {
  const { submit, popup } = useSubmit('/account/login', props.accepted);
  return (
    <div class={ACCOUNT_MANAGEMENT}>
      <div class={LOGIN_RACK}>
        <h1>{i18n.e_log_connect}</h1>
        {popup()}
        <form onSubmit={submit}>
          <Field label={i18n.e_log_username} type="text" name="username" autocomplete="username" />
          <Field label={i18n.userPwd} type="password" name="password" autocomplete="current-password" />
          <input class="submitButton" type="submit" value={`✓ ${i18n.validate}`} title={i18n.e_log_connect} />
        </form>
        <hr />
        <button class="actionButton" type="button" onClick={props.toCreation}>
          <i class="fas fa-user-circle" />
          <span>{i18n.log_createAccount}</span>
        </button>
      </div>
    </div>
  );
}

function Creation(props: { rules: Me['rules']; accepted: () => Promise<void>; back?: () => void }) {
  const { submit, popup } = useSubmit('/account/create', props.accepted);
  return (
    <>
      <div class={ACCOUNT_CREATION}>
        <h1>{i18n.e_log_createAccount}</h1>
        {popup()}
        <form class={LOGIN_RACK} autocomplete="off" onSubmit={submit}>
          <Field label={i18n.e_log_username} type="text" name="username" autocomplete="username" rule={props.rules.username} />
          <Field label={i18n.userPwd} type="password" name="password" autocomplete="current-password" rule={props.rules.password} />
          <Field label={i18n.e_log_email} type="email" name="email" />
          <input class="submitButton" type="submit" value={`✓ ${i18n.validate}`} title={i18n.e_log_createAccount} />
        </form>
      </div>
      <Show when={props.back}>
        <button class="back" type="button" title={i18n.back} onClick={props.back}>
          {`<< ${i18n.back}`}
        </button>
      </Show>
    </>
  );
}

function Management(props: { me: Me; username: string; disconnected: () => Promise<void> }) {
  const library = () => `/u/${props.username}`.toLowerCase();

  return (
    <div class={ACCOUNT_MANAGEMENT}>
      <Editors owner={props.username} colors={props.me.colors} picture={props.me.profilePicture} />
      <div>{filled(i18n.welcome_back, props.username)}</div>
      <div class={LOGIN_RACK}>
        <Show when={location.pathname.toLowerCase() !== library()}>
          <button
            class="actionButton"
            type="button"
            onClick={() => {
              location.href = library();
            }}
          >
            <i class="fas fa-book" />
            <span>{i18n.log_accessMyLib}</span>
          </button>
        </Show>
        <button
          class="actionButton"
          type="button"
          onClick={() => {
            void fetch('/account/disconnect', { method: 'POST' }).then(props.disconnected);
          }}
        >
          <i class="fas fa-power-off" />
          <span>{i18n.log_disconnect}</span>
        </button>
      </div>
      <div>
        <a target="_blank" href={props.me.companionApp.url} rel="noopener">
          <div class="flex flex-col bg-white px-0 py-[.25em] text-[#515151] [transition:opacity_.2s] hover:opacity-80">
            <span>
              <span>{i18n.obtainCompanionApp_1} </span>
              <span class="text-[#d20068] [text-shadow:white_0_0_2px]">{props.me.companionApp.name}</span>
            </span>
            <span>{i18n.obtainCompanionApp_2}</span>
          </div>
        </a>
      </div>
    </div>
  );
}

export interface AccountControls {
  // what the account is now, false if it could not be known
  load: () => Promise<boolean>;
}

export function AccountPage(props: {
  // in the library page's panel : it stays there, where the page of its own goes to the library
  embedded?: boolean;
  // how to go from a view to another, at once otherwise
  change?: (work: () => void) => Promise<unknown>;
  controls?: (controls: AccountControls) => void;
}) {
  const [me, setMe] = createSignal<Me | null>(null);
  const [creating, setCreating] = createSignal(location.pathname === '/account/create');

  const changeView = (work: () => void) => props.change?.(work) ?? work();

  async function load(): Promise<boolean> {
    const known = await fetchMe();
    if (known) await changeView(() => setMe(known));
    return known !== null;
  }
  props.controls?.({ load });
  if (!props.embedded) void load();

  async function loggedIn() {
    const known = await fetchMe();
    if (!props.embedded && known?.username) {
      location.href = `/u/${known.username}`;
      return;
    }
    if (known) {
      await changeView(() => {
        setCreating(false);
        setMe(known);
      });
    }
  }

  const toCreation = () => {
    if (props.embedded) void changeView(() => setCreating(true));
    else location.href = '/account/create';
  };

  return (
    <Show when={me()}>
      {known => (
        <Show
          when={known().username}
          fallback={
            <Show when={creating()} fallback={<Login accepted={loggedIn} toCreation={toCreation} />}>
              <Creation
                rules={known().rules}
                accepted={loggedIn}
                back={props.embedded ? () => void changeView(() => setCreating(false)) : undefined}
              />
            </Show>
          }
        >
          {username => <Management me={known()} username={username()} disconnected={loggedIn} />}
        </Show>
      )}
    </Show>
  );
}
