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
    //from the header, as the page may be scrolled. Which one shows depends on the width of the page
    let headerTop = document.getElementsByTagName("header")[0].getBoundingClientRect().top;
    let tops = [];

    document.querySelectorAll("#app-music-library .connect-side").forEach(
        function (e) {
            if (e.getClientRects().length) {
                tops.push(e.getBoundingClientRect().top - headerTop);
            }
        }
    );
    if (!tops.length) {
        return;
    }

    let target = document.querySelector("#app-connect .connect-side")
    target.style.top = Math.max(...tops) + "px";
}

function linkToYoutube(artist, albumOrTitle)
{
    //
    const raw_search = (artist + ' ' + albumOrTitle).replaceAll('  ', ' ').toLowerCase();

    //link to YT
    const yt_query = 'https://www.youtube.com/results?search_query=';
    const prepared_query = encodeURIComponent(raw_search).replaceAll('%20', '+');

    //
    return yt_query + prepared_query;
}
