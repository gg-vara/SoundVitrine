// Entry of the browser build, on the account page when it is a page of its own
import { render } from '@solidjs/web';
import { AccountPage } from './AccountPage';

render(() => <AccountPage />, document.getElementById('account') as HTMLElement);
