
///
/// resize handling
///

//resize functions
function bindResizeFunctions() {
    //
    resizeFunctions.width.resizeFeed = () => resizeFeed().applyNewHeight;
    resizeFunctions.width.resizeShout = () => resizeShout().applyNewHeight;
    resizeFunctions.width.alignConnectSideElements = () => () => alignConnectSideElements;

    //
    resizeFunctions.any.headerToggle = () => () => headerToggle;

    Object.keys(_discoverFilter).forEach((id) => {
        const key = "applyManualSizesFilterUIs[" + id + "]";
        resizeFunctions.any[key] = () => () => applyManualSizesFilterUIs(id);
    });
};

var sourceHeight = window.innerHeight;
var sourceWidth = window.innerWidth;
/** @type {Object<string, Object<string, () => (() => void | null )>>} */
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

    /**
     * 
     * @param {Date} date 
     * @param {string} logTrackId 
     * @returns {(arg0: () => (() => void | null)) => void}
     */
    const execFunc = function (date, logTrackId) {
        /** @type {(functorObj: () => (() => void | null)) => void} */
        return (functorObj) => {
            //console.log("["+ date +"] " + logTrackId + " : " + functorObj.description);
            if (functorObj != null) functorObj();
        };
    };

    const date = new Date();

    //height or width...
    Object.values(resizeFunctions.any).forEach(
        execFunc(date, "any")
    );

    //height...
    if (newHeight != sourceHeight) {
        sourceHeight = newHeight;
        Object.values(resizeFunctions.height).forEach(
            execFunc(date, "height")
        );
    }

    //width...
    if (newWidth != sourceWidth) {
        sourceWidth = newWidth;
        Object.values(resizeFunctions.width).forEach(
            execFunc(date, "width")
        );
    }

}

