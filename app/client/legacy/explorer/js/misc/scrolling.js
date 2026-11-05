
/*Prevent Scroll Event triggering */
function preventSET(inBetweenPromise) {
    //temporary disabling event listening
    document.removeEventListener("scroll", _onScroll);
    return inBetweenPromise.then(
        function (elem) {
            document.addEventListener("scroll", _onScroll);
            return elem;
        }
    );
}

var checkScrollSpeed = (function (settings) {
    settings = settings || {};

    var lastPos, newPos, timer, delta,
        delay = settings.delay || 100; // in "ms" (higher means lower fidelity )

    function clear() {
        lastPos = null;
        delta = 0;
    }

    clear();

    return function () {
        newPos = window.scrollY;
        if (lastPos != null) { // && newPos < maxScroll 
            delta = newPos - lastPos;
        }
        lastPos = newPos;
        clearTimeout(timer);
        timer = setTimeout(clear, delay);
        return delta;
    };
})();


function _onScroll() {
    let ss = checkScrollSpeed();
    if (Math.abs(ss) < 10) {
        return;
    }
    headerToggle();
}

/////////////////////////
//scroll event handling//
/////////////////////////

// find direction based on last position
// null = not moved
// true = going down
// false = going up
var sueh_last_scroll_pos = 0;
function findScrollingDirection() {
    let currentDirection = null;
    let newPos = window.scrollY;
    if (newPos != sueh_last_scroll_pos) {
        currentDirection = newPos > sueh_last_scroll_pos;
        sueh_last_scroll_pos = newPos;
    }
    return currentDirection ? "down" : "up";
}

var sueh_ticking = false;
function headerToggle() {
    //if no animation on run...
    let updateCl = mustHeaderUpdateAnimation(findScrollingDirection());
    if (!sueh_ticking && updateCl !== false) {

        //lock
        sueh_ticking = true;

        //cpu optimisation for execution
        window.requestAnimationFrame(
            function () {

                //animate
                updateHeaderClasses(updateCl);

                //release
                sueh_ticking = false;
            }
        );
    }
}


//find if Header should be animated
function mustHeaderUpdateAnimation(directionToCompute) {
    if (directionToCompute == null) {
        return false;
    }

    //prepare
    let header = document.getElementsByTagName("header")[0];
    let isHidden = header.classList.contains("toHide");
    let isSticky = header.classList.contains("sticky");
    let ooR = isHeaderOutOfReach();
    let mustSticky = "";
    let mustHide = "";

    //if user is searching
    let isSRUsed = document.querySelectorAll("header .searchResults.show").length;

    //rules...
    if (isSRUsed || directionToCompute == "up") {
        mustSticky = "sticky";
    } else if (directionToCompute == "down" && ooR) {
        mustHide = "toHide";
        if (isSticky) {
            mustSticky = "sticky";
        }
    }

    //compute and compare new and old classes
    let newClasses = [mustSticky, mustHide].join(" ").trim();
    return newClasses == header.getAttribute("class") ? false : newClasses;
}

function updateHeaderClasses(updateCl) {
    document.getElementsByTagName("header")[0].setAttribute("class", updateCl);
}

function isHeaderOutOfReach() {
    let header = document.getElementsByTagName("header")[0];
    let headerHeight = header.clientHeight;
    let scrollHeight = window.scrollY;
    return scrollHeight > headerHeight;
}

function registerXNavigateSwipeEvents() {
    var hammertime = new Hammer(document.body, { inputClass: Hammer.TouchInput });

    hammertime.on(
        'swipeleft swiperight', function (ev) {
            hNavigate(ev.direction);
        }
    );

    document.addEventListener("scroll", _onScroll);
}
