function _popup(event) {
    event.currentTarget.classList.toggle("hide");
}

function RGBToHex(rgb) {
    // Choose correct separator
    let sep = rgb.indexOf(",") > -1 ? "," : " ";
    // Turn "rgb(r,g,b)" into [r,g,b]
    rgb = rgb.substr(4).split(")")[0].split(sep);

    let r = (+rgb[0]).toString(16),
        g = (+rgb[1]).toString(16),
        b = (+rgb[2]).toString(16);

    if (r.length == 1) {
        r = "0" + r;
    }
    if (g.length == 1) {
        g = "0" + g;
    }
    if (b.length == 1) {
        b = "0" + b;
    }

    return "#" + r + g + b;
}

function getSiblings(elem) {

    // Setup siblings array and get the first sibling
    var siblings = [];
    var sibling = elem.parentNode.firstChild;

    // Loop through each sibling and push to the array
    while (sibling) {
        if (sibling.nodeType === 1 && sibling !== elem) {
            siblings.push(sibling);
        }
        sibling = sibling.nextSibling
    }

    return siblings;

};

const transitionEndEventName = (() => {
    var el = document.createElement('fakeelement');
    var transitions = {
        'transition': 'transitionend',
        'OTransition': 'oTransitionEnd',
        'MozTransition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd'
    }

    for (var t in transitions) {
        if (el.style[t] !== undefined) {
            return transitions[t];
        }
    }
})();
const animationEndEventName = (() => {
    var t,
        el = document.createElement("fakeelement");
    var animations = {
        "animation": "animationend",
        "OAnimation": "oAnimationEnd",
        "MozAnimation": "animationend",
        "WebkitAnimation": "webkitAnimationEnd"
    };
    for (t in animations) {
        if (el.style[t] !== undefined) {
            return animations[t];
        }
    }
})();

var _waiterStack = {};

/**
 * 
 * @param {string} eventNameToListen name of the event to listen to
 * @param {*} eventEmitter 
 * @param {(eventEmitter: any) => {}} actionThatShouldTriggerEvent 
 * @param {string | null} targetPseudoElem 
 * @returns 
 */
function _waitEventEnd(eventNameToListen, eventEmitter, actionThatShouldTriggerEvent, targetPseudoElem) {

    //if no action, immediate return
    if (!actionThatShouldTriggerEvent) {
        return Promise.resolve(null);
    }

    return new Promise(
        function (resolve) {

            let isAnim = eventNameToListen.includes("nimation");
            let newId = String(Date.now()) + '_' + String(Math.round(Math.random() * 100)) + '_' + String(eventEmitter.id);
            let waiterStyle = window.getComputedStyle(eventEmitter, null);
            let pseudoStyle = window.getComputedStyle(eventEmitter, targetPseudoElem);
            let eventsToExpect = isAnim ? pseudoStyle["animation-name"].split(",")
                : pseudoStyle["transition-property"].split(",");


            if (isAnim && (waiterStyle["display"] == "none" || pseudoStyle["display"] == "none")) {
                //animationEnd will never be triggered, resolve...
                return resolve(eventEmitter);
            }

            _waiterStack[newId] = {
                expectedEvents: eventsToExpect,
                eventEndHits: [],
                onEventEnd: function (e) {

                    //event triggered on property
                    _waiterStack[newId].eventEndHits.push(isAnim ? e.animationName : e.propertyName);

                    //if count... disengage
                    if (_waiterStack[newId].eventEndHits.length == _waiterStack[newId].expectedEvents.length) {

                        eventEmitter.removeEventListener(eventNameToListen, _waiterStack[newId].onEventEnd); //console.log("out", eventEmitter);
                        delete _waiterStack[newId];
                        return resolve(eventEmitter);
                    }
                }
            };

            eventEmitter.addEventListener(eventNameToListen, _waiterStack[newId].onEventEnd); //console.log("in", eventEmitter);

            // execute the action
            actionThatShouldTriggerEvent(eventEmitter);
        }
    );
}

function waitAnimationEnd(eventEmitter, action, targetPseudoElem) {
    return _waitEventEnd(animationEndEventName, eventEmitter, action, targetPseudoElem);
}

function waitTransitionEnd(eventEmitter, action, targetPseudoElem) {
    return _waitEventEnd(transitionEndEventName, eventEmitter, action, targetPseudoElem);
}

function debounce(callback, delay) {
    var timer;
    return function () {
        var args = arguments;
        var context = this;
        clearTimeout(timer);
        timer = setTimeout(
            function () {
                callback.apply(context, args);
            }, delay
        )
    }
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function compareDateFromNomHumanized(strISO8601, dateNow) {
    if (!dateNow) {
        dateNow = new moment();
    }
    let dateThen = moment(strISO8601);
    dateThen.locale(lang);
    return dateThen.from(dateNow);
}

/**
 * 
 * @param {string} dateFrom should be UTC+0 ISO string representation of when the shout was done at last
 * @returns 
 */
function calculateMillisecondsElapsed(dateFrom) {
    const dateNow = new moment();
    const dateThen = moment(dateFrom);
    const mDiff = dateNow.diff(dateThen);

    const diffMSecs = moment.duration(mDiff).asMilliseconds();

    if (diffMSecs < 0) {
        console.warn("Shout update could never happen in the future ! Please check that the date provided by shout is UTC+0 compliant (no local timezoned)");
    }

    return diffMSecs;
}

function getRootElementFontSize() {
    // Returns a number
    return parseFloat(
        // of the computed font-size, so in px
        getComputedStyle(
            // for the root <html> element
            document.documentElement
        ).fontSize
    );
}

function slugify(string, keepOriginalLength) {

    keepOriginalLength = keepOriginalLength ? "-" : '';

    const a = 'àáäâãåèéëêìíïîòóöôùúüûñçßÿœæŕśńṕẃǵǹḿǘẍźḧ·/_,:;';
    const b = 'aaaaaaeeeeiiiioooouuuuncsyoarsnpwgnmuxzh------';
    const p = new RegExp(a.split('').join('|'), 'g');
    return string.toString().toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with
        .replace(
            p, function (c) {
                return b.charAt(a.indexOf(c));
            }
        ) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with ‘and’
        .replace(/[^\w\-]+/g, keepOriginalLength) // Remove all non-word characters
        .replace(/\-\-+/g, '-') // Replace multiple — with single -
        .replace(/^-+/, ''); // Trim — from start of text .replace(/-+$/, '') // Trim — from end of text
}



function _XMLHttpPromise(method, url, POSTParams) {

    return new Promise(
        function (resolve, reject) {

            let xhr = new XMLHttpRequest();
            if (!method) {
                method = "GET";
            }
            xhr.open(method, url);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

            xhr.onload = function () {
                if (this.status >= 200 && this.status < 300) {
                    resolve(xhr);
                } else {
                    reject(
                        {
                            status: this.status,
                            statusText: xhr.statusText
                        }
                    );
                }
            };

            xhr.onerror = function () {
                reject(
                    {
                        status: this.status,
                        statusText: xhr.statusText
                    }
                );
            };

            xhr.send(POSTParams);
        }
    );

}
