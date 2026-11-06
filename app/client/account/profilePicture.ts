// Choosing the user's picture, on the account page
import { waitTransitionEnd } from '../shell/waiting';

// its address once stored, nothing if the server refuses the file
async function upload(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/account/pp', { method: 'POST', body });
  if (!response.ok) throw new Error(`/account/pp : ${response.status}`);
  return response.text();
}

export function startProfilePictureEditor(elementId: string) {
  const editor = document.getElementById(elementId);
  if (!editor) return;

  const picker = editor.querySelector('.PPPicker') as HTMLInputElement;
  const holder = editor.querySelector('.imgHolder') as HTMLElement;
  const image = holder.querySelector('img') as HTMLImageElement;
  const openPicker = () => picker.click();

  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    if (!file) return;

    editor.removeEventListener('click', openPicker);
    const [uploaded] = await Promise.allSettled([upload(file), waitTransitionEnd(holder, () => editor.classList.add('uploading'))]);

    // the picture it had stays otherwise
    if (uploaded.status === 'rejected') console.error('The picture could not be uploaded', uploaded.reason);
    else if (uploaded.value) {
      // same address as the previous one when of the same type, which the browser keeps for a while : refreshed for its other
      // pages, and this one must not reuse what it already decoded
      void fetch(uploaded.value, { cache: 'reload' }).catch(() => {});
      image.src = `${uploaded.value}?${Date.now()}`;
    }

    editor.addEventListener('click', openPicker);
    void waitTransitionEnd(holder, () => editor.classList.remove('uploading'));
  });

  editor.addEventListener('click', openPicker);
}
