/**
 * 
 * @param   {*} targetId which element should open or close
 * @param   {*} reason should open or close shutter
 * @param   {*} nextType 
 * @returns {{ next: string | boolean, applyNewHeight: (() => void) | null }}
 */
function _resizeShutter(targetId, reason, nextType) {
    const target = document.getElementById(targetId);
    const heightSwitch = reason ? target.scrollHeight + "px" : "";
    const changed = target.style.maxHeight != heightSwitch;

    const updateTargetMaxHeight = function () {
        window.requestAnimationFrame(
            function () {
                target.style.maxHeight = heightSwitch;
            }
        );
    };

    return {
        next: nextType == "changed" ? changed : heightSwitch,
        applyNewHeight: (changed ? updateTargetMaxHeight : null)
    };
}

function _toggleShutter(targetId, resizeInstructionsGetter) {

    let anim = new Promise(
        function (resolve) {

            let reziseInstructions = resizeInstructionsGetter();

            waitTransitionEnd(
                document.getElementById(targetId),
                reziseInstructions.applyNewHeight
            ).then(resolve);

        }
    );

    return anim;
}


//scrolls to element
function vNavigate(elem, correct) {

    if (!elem) {
        resolve();
    }
    let relativeDocumentOffset = elem.getBoundingClientRect().top + window.scrollY;
    let elemPos = relativeDocumentOffset + (correct || 0);
    let isScrollerAtDest = function () {
        return elemPos == window.scrollY || document.body.scrollHeight == window.innerHeight;
    };

    if (isScrollerAtDest()) {
        updateHeaderClasses("sticky"); return;
    }

    //push the menu up
    let rollbackMenu = function () {
        return waitTransitionEnd(
            document.getElementsByTagName("header")[0],
            function () {
                updateHeaderClasses("sticky toHide");
            }
        ).then(
            function () {
                updateHeaderClasses("");
            }
        );
    };

    //scroll to destination
    let scrollToDest = function () {
        return new Promise(
            function (resolve) {

                //action
                window.scroll(0, elemPos);

                //wait...
                let timeoutMs = 0;
                let timeoutStepMs = 100;
                let timeoutLimit = function () {
                    timeoutMs = timeoutMs + timeoutStepMs; return timeoutMs > 2000;
                };
                var untilScrollIsOver = setInterval(
                    function () {
                        if (isScrollerAtDest() || timeoutLimit()) {
                            clearInterval(untilScrollIsOver);
                            resolve();
                        }
                    }, timeoutStepMs
                );

            }
        );
    };

    //wait for both animations to continue
    return Promise.all(
        [
            rollbackMenu(),
            scrollToDest()
        ]
    );
}


//for mobile, unselect selected item for disabling animations
function blurCurrentFocus() {
    document.body.focus();
}

function hNavigate(direction) {

    blurCurrentFocus();

    let target = document.getElementsByTagName('main')[0];
    let maxChildren = target.childElementCount;
    let maxIndex = maxChildren - 1;
    let actualIndex = target.getAttribute("data-index") || 0;
    let targetIndex = null;

    let followUp = Promise.resolve(null);
    let lateVideoStop = Promise.resolve(null);

    //direction to go
    if (direction == null) { //automatic switch
        targetIndex = Number(actualIndex) ? 0 : 1;
    } else if (direction == 2) {
        targetIndex = actualIndex + 1;
    } else if (direction == 4) {
        targetIndex = actualIndex - 1;
    }

    //so dont move
    if (targetIndex == actualIndex || targetIndex == null) {
        return;
    }
    if (targetIndex > maxIndex || targetIndex < 0) {
        return;
    }

    //remove Vscroll on connect
    if (targetIndex == 1) {
        document.body.classList.add("lock");
        followUp = function () {
            _rLoader.initialAnimation();
        };
    } else {
        followUp = function () {
            document.body.classList.remove("lock");
        };
    }

    //scroll back to top
    target.setAttribute("data-index", targetIndex);
    window.scrollTo({ top: 0 });

    //reset focus flag
    for (let i = 0; i < maxChildren; i++) {
        let child = target.children[i];
        if (i == targetIndex) {
            child.classList.add('focused');
        } else {
            child.classList.remove('focused');
        }
    }

    //define playstate for video bg
    let bgVideo = document.getElementById("bg");
    if (targetIndex == 0) {
        lateVideoStop = function () {
            bgVideo.pause();
        }
    } else {
        bgVideo.play();
    }


    //move...
    waitTransitionEnd(
        target, function () {
            target.style.transform = "translateX(-" + String(targetIndex * 100) + "%)";
        }
    )
        .then(alignConnectSideElements)
        .then(lateVideoStop)
        .then(followUp);
}
