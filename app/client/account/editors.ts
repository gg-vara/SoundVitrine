// What the account page offers to change, when logged in : each looks for its element
import { startBandEditor } from './bandEditor';
import { startProfilePictureEditor } from './profilePicture';

export function startEditors() {
  startProfilePictureEditor('ProfilePicEditor');
  startBandEditor('bBandEditor');
}
