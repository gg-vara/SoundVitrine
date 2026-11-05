/** @type {EventSource} */
var shoutES = null;

/**
 * the latest shout, then the next ones as they come (server-sent events of shoutStreamUrl)
 */
function setupLiveUpdatesForShouts() {
    //
    fetch(clientURLShout).then(async e => {
        //
        if(e.status != 200) {
            return;
        }

        //
        const shout = await e.json();
        onReceivedShout(shout);
    });

    //
    shoutES = new EventSource(shoutStreamUrl);

    /**
     * 
     * @param {MessageEvent} event 
     */
    const onMessage = (event) => {
        const shout = JSON.parse(event.data);
        onReceivedShout(shout);
    };

    /** */
    const onError = () => {
        // close current
        shoutES.close();

        // retry, without flooding a server that is restarting
        setTimeout(setupLiveUpdatesForShouts, 5000);
    }

    //
    shoutES.onmessage = onMessage;
    shoutES.onerror = onError;
}

//
//
//

/**
 * Depending on shout timestamp, determines if it is meaningful or not to update any informations on UI relative to its update
 * @param {object} shoutData 
 * @returns {boolean}
 */
function isWorthDisplayingShout(shoutData) {
    if (typeof(shoutData['duration']) !== 'number' || typeof(shoutData['date']) !== 'string') return false; // if is no correct data about track length or current timestamp, aint no worth
    if (!shoutData['playerState']) return true; // if is paused, always meaningful

    //
    // so then, if it is playing and remaning time comparing dates
    //

    /** @type {number} */
    const effectiveDurationMS = (shoutData['duration'] ?? 0) * 1_000;
    /** @type {number} */
    const effectivePlayerPositionMS = shoutData['playerPositionMS'] ?? 0;

    //
    const remainingMSBeforeTrackPlayEnds = Math.max(effectiveDurationMS - effectivePlayerPositionMS, 0);

    /** @type {string} UTC+0 ISO timestamp */
    const shoutTs = shoutData['date'];
    const millisecondsElapsedSinceLatestShoutUpdate = calculateMillisecondsElapsed(shoutTs);
    const isWorthDisplaying = (remainingMSBeforeTrackPlayEnds - millisecondsElapsedSinceLatestShoutUpdate) > 0;

    //
    return isWorthDisplaying;
}

//sound handling
var notificationShoutSound = null;
var msnStorageKey = 'muteShoutNotification';
function instShoutMuteButton() {
    
    //prepare
    let mustMute = localStorage.getItem(msnStorageKey);
    let icon = document.querySelector('#shoutContainer .mute i');
    
    //instantiate sound
    if (notificationShoutSound == null) {
        notificationShoutSound = new Audio('/public/audio/long-expected.mp3');
        notificationShoutSound.autoplay = false;
        notificationShoutSound.muted = false;
    }

    //generate on state change
    if (mustMute == "1") {
        notificationShoutSound.volume = 0;
        icon.classList.remove('fa-bell');
        icon.classList.add('fa-bell-slash');
        icon.setAttribute('title', icon.getAttribute("title-on"));
    } else {
        notificationShoutSound.volume = .5;
        icon.classList.remove('fa-bell-slash');
        icon.classList.add('fa-bell');
        icon.setAttribute('title', icon.getAttribute("title-off"));
    }
}

//click toogle from UI
function toggleShoutSound(event) {
    let mustMute = localStorage.getItem(msnStorageKey);
    localStorage.setItem(msnStorageKey, mustMute == "1" ? "0" : "1");
    instShoutMuteButton();
}


function _isInClientViewField(elem) {
    let boundaries = elem.getBoundingClientRect();
    return boundaries.bottom >= 0 && boundaries.left >= 0;
}

/**
 * will handle the way to display new shout data
 * @param {{
 *  album: string
 *  artist: string
 *  date: string
 *  duration: number
 *  genre: string
 *  md5: string
 *  name: string
 *  playerPosition: number
 *  playerState: boolean
 *  year: number
 * }} newShoutData 
 */
async function onReceivedShout(newShoutData) {

    //update current shout
    _currentShoutDWorth = isWorthDisplayingShout(newShoutData);

    //check what kind of update to apply
    let isNoMusicShout = newShoutData['date'] && Object.keys(newShoutData).length == 1;
    let changes = compareShoutChanges(newShoutData);
    let isHardChange = !isNoMusicShout && (
        changes.includes('artist') || changes.includes('album') || changes.includes('name')
    );

    
    // fetch elements
    let shoutContainer = document.getElementById('shoutContainer');
    let notif = document.getElementById('shoutNotification');
    if (!shoutContainer || !notif) { return; }


    //if shouts are already kicking in > trigger notif before re-toggling
    let isShoutContainerRefreshingContent = shoutContainer.clientHeight > 0;
    if (isShoutContainerRefreshingContent && notif.classList.contains('fade') && isHardChange) {
        await waitTransitionEnd(notif, function() {
            notif.classList.remove('fade');
        });
    }
    
    await toggleShout();

    _updateShoutDisplayableData(newShoutData, changes);

    //update values
    _currentShout = newShoutData;


    //display main notif frame
    if (isHardChange) {

        // if main shout display is out of frame, also display a small floating widget
        if (!_isInClientViewField(shoutContainer)) {
            displayBrieflyNotificationWidget();
        }

        //
        window.requestAnimationFrame(function() {
            //
            mayTriggerNotificationSound();
            
            // display
            notif.classList.add('fade');
        });
    }
}

function displayBrieflyNotificationWidget() {
    // get widget
    const widget = document.getElementById('shoutNotificationWidget');
    if(!widget) { return; }

    // animate
    window.requestAnimationFrame(function() {
        widget.classList.remove('show');
        void widget.offsetWidth;
        widget.classList.add('show');
    });
}

function mayTriggerNotificationSound() {
    /** CHROME API */
    const hasUserBeenActive = navigator.userActivation != null && navigator.userActivation.hasBeenActive;

    /** FIREFOX API */
    const isAllowedToPlayByPolicy = navigator.getAutoplayPolicy != null && navigator.getAutoplayPolicy(notificationShoutSound) === "allowed";
    
    // check
    if (hasUserBeenActive || isAllowedToPlayByPolicy) {
        //play sound
        notificationShoutSound.play().then(null, function(_) {
            /* expected on Chrome */
        });
    }
}

//list changes between states
function compareShoutChanges(newShout) {

    a = Object.keys(_currentShout);
    b = Object.keys(newShout);
    c = new Set(a.concat(b));
    d = [];
    c.forEach (function(v){d.push(v);});
    return d.filter(function(id){
        return newShout[id] !== _currentShout[id];
    });
}


function _updateShoutDisplayableData(shoutData, changes) {

    //prepare data helpers
    let artist = shoutData['artist'];
    let name = shoutData['name'];
    let album = shoutData['album'];
    let genre = shoutData['genre'];
    let year = shoutData['year'];
    let duration = shoutData['duration'];
    let state = shoutData['playerState'];

    //update image
    if (changes.includes('album')) {
        let aImage = document.querySelector('#shoutContainer .cover');
        resetImgLoader(aImage);
        if (album && artist) queryMusicBrainzForAlbumCover('shout', album, artist).then(
            function(imgUrl) {
                updateImgLoader(aImage, imgUrl);
            },function() {
                brokenImgFr(aImage);
            }
        );
    }

    //update link
    if (changes.includes('artist') || changes.includes('name')) {
        let aLink = document.querySelector('#shoutContainer a');
        aLink.removeAttribute('href');
        aLink.removeAttribute('target');
        if (artist && name) {
            aLink.setAttribute('href', linkToYoutube(artist, name));
            aLink.setAttribute('target','_blank');
        }
    }

    //update track name
    if (changes.includes('name')) {
        let aDescr = document.querySelector('#shoutContainer .albumDesc .name');
        aDescr.textContent = name || '';
    }

    //update meta 
    if (changes.includes('artist') || changes.includes('album')) {
        let aMeta = document.querySelector('#shoutContainer .albumDesc .meta');
        let meta = artist && album ? [artist, album].join(" - ") : '';
        if (year) meta += " (" + year + ")";
        aMeta.textContent = meta;
        if (genre) {
            let metaElem = document.createElement('span');
            metaElem.textContent = meta;
            let genreElem = document.createElement('span');
            genreElem.style.color = 'grey';
            genreElem.textContent = " // " + genre;
            aMeta.replaceChildren(metaElem, genreElem);
        }
    }

    //update timeline
    if (changes.includes('duration') || changes.includes('playerPositionMS') || changes.includes('playerState') || changes.includes('date')) {
        let aTimeline = document.querySelector('#shoutContainer .timeline');
        
        //reset animation
        aTimeline.style.animationDuration = null;
        aTimeline.style.animationDelay = null;
        aTimeline.style.animationPlayState = null;
        aTimeline.classList.remove('animTimeline');

        //progress bar
        void aTimeline.offsetWidth;
        let position = shoutData['playerPositionMS'] + (state ? calculateMillisecondsElapsed(shoutData['date']) : 0);
        aTimeline.style.animationDuration = duration + 's';
        aTimeline.style.animationDelay = -position + 'ms';
        if (!state) aTimeline.style.animationPlayState = 'paused';
        aTimeline.classList.add('animTimeline');      
    }

}

///
/// resize functions
///

function resizeShout() {
    return _resizeShutter(
        'shoutContainer', 
        _currentShoutDWorth
    );
}

function toggleShout() {
    return _toggleShutter('shoutContainer', resizeShout);
}