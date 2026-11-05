///
/// Img loading
///

function brokenImgFr(elem)
{
    
    waitTransitionEnd(
        elem, function () {
            elem.classList.add("fo");
        }
    ).then(
        function () {
            elem.firstElementChild.removeAttribute('src');
            elem.classList.remove('searchingCover');
            elem.classList.remove('fo');
            elem.classList.add('noImgFound');
        }
    );
}

function brokenImg(event)
{
    brokenImgFr(event.currentTarget.parentElement);
}

function imgLoaded(event)
{
    let imgLoader = event.currentTarget.parentElement;
    
    waitTransitionEnd(
        imgLoader, function () {
            imgLoader.classList.add("fo");
        }
    ).then(
        function () {
            imgLoader.classList.remove('searchingCover');
            imgLoader.classList.remove('fo');
        }
    );
}

function resetImgLoader(elem)
{
    elem.firstElementChild.removeAttribute('src');
    elem.classList.remove('noImgFound');
    elem.classList.add('searchingCover');
}

function updateImgLoader(elem, imgUrl)
{
    elem.firstElementChild.setAttribute('src', imgUrl);
}

///
/// MusicBrainz Integration
/// 

var request_qmbfac = {};
function queryMusicBrainzForAlbumCover(idProcess, album, artist)
{
    if (!idProcess) { idProcess = 'albumInfos';
    }

    return new Promise(
        function (resolve, reject) {

            let urlBase =  'https://musicbrainz.org/ws/2/release-group/?limit=1&fmt=json&query=';
            let queryObj = {
                release : album || _discoverFilter["albumUI"],
                artist :  artist || _discoverFilter["artistUI"]
            };
    
            //if elements missing, abort
            if (!queryObj.release || !queryObj.artist) { reject();
            }
    
            //join and make request query
            let queryArr = Object.keys(queryObj).map(
                function (e) {
                    return e.toLowerCase() + ':' + queryObj[e].toLowerCase();
                }
            );
            let query = encodeURI(queryArr.join(" AND "));
            query = urlBase + query;
        
            //begin request and terminate non-finished previous request
            if (request_qmbfac[idProcess]) { request_qmbfac[idProcess].abort();
            }
            request_qmbfac[idProcess] = new XMLHttpRequest();

            request_qmbfac[idProcess].onloadend = function (e) {
                let text = e.currentTarget.responseText;
                if (!text) {reject(); return;}
                let obj = JSON.parse(text);
                let imgUrl = mbQueryCoverArtAPI(obj['release-groups']);
                imgUrl ? resolve(imgUrl) : reject();
            };
            request_qmbfac[idProcess].open('GET', query, true);
            request_qmbfac[idProcess].send(null);
        }
    );
}

function mbQueryCoverArtAPI(mbReleasesArray)
{
    if (!mbReleasesArray.length) { return;
    }
    let urlBase = 'https://coverartarchive.org/release-group/{mbid}/front-250';
    return urlBase.replace('{mbid}', mbReleasesArray[0].id);
}

