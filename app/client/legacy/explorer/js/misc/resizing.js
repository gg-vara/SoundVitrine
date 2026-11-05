
///
/// resize handling
///

//resize functions
function bindResizeFunctions() {
    //what opens under the header holds as much as its content needs, which depends on the width
    resizeFunctions.width.resizeFeed = () => resizeFeed().applyNewHeight?.();
    resizeFunctions.width.resizeStats = () => resizeStats().applyNewHeight?.();
    resizeFunctions.width.resizeProfile = () => resizeProfile().applyNewHeight?.();
    resizeFunctions.width.resizeShout = () => resizeShout().applyNewHeight?.();
    resizeFunctions.width.alignConnectSideElements = () => alignConnectSideElements();

    //
    resizeFunctions.any.revealHeaderInReach = () => revealHeaderInReach();
};

var sourceHeight = window.innerHeight;
var sourceWidth = window.innerWidth;
/** @type {Object<string, Object<string, () => void>>} */
var resizeFunctions = {
    height: {},
    width: {},
    any: {}
};

//event listener with throttle
window.addEventListener('resize',
    debounce(resizeManualHeightsAndWidths, 250)
);

window.addEventListener('orientationchange', function () {
    window.scrollTo({ left: 0 });
});

function resizeManualHeightsAndWidths() {

    //prepare
    const newHeight = window.innerHeight;
    const newWidth = window.innerWidth;

    /** @param {Object<string, () => void>} functions */
    const run = (functions) => Object.values(functions).forEach((resize) => resize());

    //height or width...
    run(resizeFunctions.any);

    //height...
    if (newHeight != sourceHeight) {
        sourceHeight = newHeight;
        run(resizeFunctions.height);
    }

    //width...
    if (newWidth != sourceWidth) {
        sourceWidth = newWidth;
        run(resizeFunctions.width);
    }

}

