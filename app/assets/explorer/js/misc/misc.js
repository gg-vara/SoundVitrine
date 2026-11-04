function removeNotification(selector)
{
    document.querySelectorAll(selector).forEach(
        function (elem) {
            waitAnimationEnd(
                elem, function () {
                    elem.classList.add("notifOut");
                }, "::after"
            ).then(
                function () {
                    elem.classList.remove("notif");
                    elem.classList.remove("notifOut");
                }
            );
        }
    );
}

function alignConnectSideElements()
{
    let topMost = [];

    document.querySelectorAll("#app-music-library .connect-side").forEach(
        function (e) {
            topMost.push(e.getBoundingClientRect().top);
        }
    );
    topMost = Math.max(...topMost);

    let target = document.querySelector("#app-connect .connect-side")
    target.style.top = topMost + "px";
}

// from https://stackoverflow.com/questions/7394748/whats-the-right-way-to-decode-a-string-that-has-special-html-entities-in-it
function decodeHtml(html)
{
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

function linkToYoutube(artist, albumOrTitle)
{
    //
    const raw_search = (artist + ' ' + albumOrTitle).replaceAll('  ', ' ').toLowerCase();

    //link to YT
    const yt_query = 'https://www.youtube.com/results?search_query=';
    const prepared_query = encodeURIComponent(
        decodeHtml(raw_search)
    ).replaceAll('%20', '+');

    //
    return yt_query + prepared_query;
}

function navigatorSpecificParameterization()
{
    if (history && history['scrollRestoration'] !== undefined) {
        history.scrollRestoration = 'manual';
    }
}