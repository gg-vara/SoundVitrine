function _popup(event) {
    event.currentTarget.classList.toggle("hide");
}

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
 * @param {CSSStyleDeclaration} style computed style of what transitions
 * @returns {number} how long its transitions last at most, delays included
 */
function _longestTransitionMs(style) {
    const toMs = function (list) {
        return list.split(",").map(function (time) {
            return parseFloat(time) * (time.trim().endsWith("ms") ? 1 : 1000);
        });
    };
    const delays = toMs(style["transition-delay"]);
    return Math.max(
        ...toMs(style["transition-duration"]).map(function (duration, i) {
            return duration + delays[i % delays.length];
        })
    );
}

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

            const disengage = function () {
                if (!_waiterStack[newId]) return;
                eventEmitter.removeEventListener(eventNameToListen, _waiterStack[newId].onEventEnd); //console.log("out", eventEmitter);
                delete _waiterStack[newId];
                resolve(eventEmitter);
            };

            _waiterStack[newId] = {
                expectedEvents: eventsToExpect,
                eventEndHits: [],
                onEventEnd: function (e) {

                    //event triggered on property
                    _waiterStack[newId].eventEndHits.push(isAnim ? e.animationName : e.propertyName);

                    //if count... disengage
                    if (_waiterStack[newId].eventEndHits.length == _waiterStack[newId].expectedEvents.length) {
                        disengage();
                    }
                }
            };

            eventEmitter.addEventListener(eventNameToListen, _waiterStack[newId].onEventEnd); //console.log("in", eventEmitter);

            //a transition that has nothing to change, or in a hidden tab, never ends
            if (!isAnim) {
                setTimeout(disengage, _longestTransitionMs(pseudoStyle) + 500);
            }

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
